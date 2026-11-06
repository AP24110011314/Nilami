import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import { useClockStore } from '../store/clock';

export interface BidUpdatedEvent {
  auctionId: string;
  currentPrice: number;
  minNextBid: number;
  bidCount: number;
  highestBidderMasked?: string;
  bid: {
    id: string;
    amount: number;
    amountMasked?: string;
    at: string;
    bidderMasked: string;
  };
  endsAt: string;
  serverTime: string;
}

export interface AuctionExtendedEvent {
  auctionId: string;
  endsAt: string;
  extensionCount: number;
  serverTime: string;
}

export interface AuctionEndedEvent {
  auctionId: string;
  status: 'ended' | 'sold' | 'unsold' | 'cancelled';
  winnerMasked?: string;
  finalPrice?: number;
  serverTime: string;
}

export interface UseAuctionSocketResult {
  isConnected: boolean;
  viewerCount: number;
  extensionFlash: boolean;
}

export function useAuctionSocket(auctionId: string | undefined): UseAuctionSocketResult {
  const queryClient = useQueryClient();
  const syncTime = useClockStore((state) => state.syncTime);

  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [extensionFlash, setExtensionFlash] = useState(false);
  const extensionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinAuctionRoom = useCallback(() => {
    if (!auctionId) return;
    const socket = getSocket();

    const t0 = performance.now();
    socket.emit(
      'join-auction',
      { auctionId },
      (res: {
        ok: boolean;
        snapshot?: {
          auction: {
            id: string;
            title: string;
            currentPrice: number;
            minNextBid: number;
            bidCount: number;
            endsAt: string;
            status: string;
            reserveMet: boolean;
            extensionCount: number;
          };
          bids: Array<{
            id: string;
            amount: number;
            bidderMasked: string;
            createdAt: string;
          }>;
          viewerCount: number;
        };
        serverTime?: string;
      }) => {
        const rtt = Math.round(performance.now() - t0);
        if (res?.ok && res.snapshot) {
          // Patch auction cache
          queryClient.setQueryData(
            ['auction', auctionId],
            (old: Record<string, unknown> | undefined) => {
              if (!old) return old;
              return {
                ...old,
                ...res.snapshot?.auction,
              };
            },
          );

          // Patch bids cache
          queryClient.setQueryData(['auction-bids', auctionId], res.snapshot.bids);

          if (typeof res.snapshot.viewerCount === 'number') {
            setViewerCount(res.snapshot.viewerCount);
          }

          if (res.serverTime) {
            syncTime(res.serverTime, rtt);
          }
        }
      },
    );
  }, [auctionId, queryClient, syncTime]);

  useEffect(() => {
    if (!auctionId) return;

    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      joinAuctionRoom();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onBidUpdated = (payload: BidUpdatedEvent) => {
      if (payload.auctionId !== auctionId) return;

      // Drop stale events based on bidCount
      queryClient.setQueryData(
        ['auction', auctionId],
        (old: { bidCount?: number } & Record<string, unknown> | undefined) => {
          if (!old) return old;
          if (typeof old.bidCount === 'number' && old.bidCount >= payload.bidCount) {
            return old; // ignore stale update
          }
          return {
            ...old,
            currentPrice: payload.currentPrice,
            minNextBid: payload.minNextBid,
            bidCount: payload.bidCount,
            highestBidderMasked: payload.highestBidderMasked,
            endsAt: payload.endsAt,
          };
        },
      );

      // Prepend to bids cache
      queryClient.setQueryData(
        ['auction-bids', auctionId],
        (oldBids: Array<{ id: string }> = []) => {
          if (oldBids.some((b) => b.id === payload.bid.id)) {
            return oldBids;
          }
          return [
            {
              id: payload.bid.id,
              amount: payload.bid.amount,
              bidderMasked: payload.bid.bidderMasked,
              createdAt: payload.bid.at,
            },
            ...oldBids,
          ];
        },
      );

      if (payload.serverTime) {
        syncTime(payload.serverTime);
      }
    };

    const onAuctionExtended = (payload: AuctionExtendedEvent) => {
      if (payload.auctionId !== auctionId) return;

      queryClient.setQueryData(
        ['auction', auctionId],
        (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            endsAt: payload.endsAt,
            extensionCount: payload.extensionCount,
          };
        },
      );

      setExtensionFlash(true);
      if (extensionTimerRef.current) clearTimeout(extensionTimerRef.current);
      extensionTimerRef.current = setTimeout(() => {
        setExtensionFlash(false);
      }, 4000);

      if (payload.serverTime) {
        syncTime(payload.serverTime);
      }
    };

    const onAuctionEnded = (payload: AuctionEndedEvent) => {
      if (payload.auctionId !== auctionId) return;

      queryClient.setQueryData(
        ['auction', auctionId],
        (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            status: payload.status,
            finalPrice: payload.finalPrice,
            winnerMasked: payload.winnerMasked,
          };
        },
      );
    };

    const onViewerCount = (payload: { auctionId: string; count: number }) => {
      if (payload.auctionId === auctionId && typeof payload.count === 'number') {
        setViewerCount(payload.count);
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden && socket.connected) {
        joinAuctionRoom();
      }
    };

    // Attach socket listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bid-updated', onBidUpdated);
    socket.on('auction-extended', onAuctionExtended);
    socket.on('auction-ended', onAuctionEnded);
    socket.on('viewer-count', onViewerCount);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial join
    if (socket.connected) {
      joinAuctionRoom();
    }

    return () => {
      if (extensionTimerRef.current) clearTimeout(extensionTimerRef.current);
      socket.emit('leave-auction', { auctionId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bid-updated', onBidUpdated);
      socket.off('auction-extended', onAuctionExtended);
      socket.off('auction-ended', onAuctionEnded);
      socket.off('viewer-count', onViewerCount);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [auctionId, joinAuctionRoom, queryClient, syncTime]);

  return {
    isConnected,
    viewerCount,
    extensionFlash,
  };
}
