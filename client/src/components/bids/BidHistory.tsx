import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { Gavel, Clock, Zap } from 'lucide-react';

interface BidItem {
  id: string;
  amount: number;
  bidderMasked: string;
  createdAt: string;
  extended?: boolean;
}

interface BidHistoryProps {
  auctionId: string;
  onNewBidCount?: (count: number) => void;
}

export const BidHistory: React.FC<BidHistoryProps> = ({ auctionId, onNewBidCount }) => {
  const { data: bids = [], isLoading } = useQuery<BidItem[]>({
    queryKey: ['auction-bids', auctionId],
    queryFn: async () => {
      const res = await apiClient.getAuctionBids(auctionId, 1, 30);
      onNewBidCount?.(res.total);
      return res.items;
    },
    staleTime: Infinity,
  });

  return (
    <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-nilami-green-dark" />
          <h3 className="font-display font-bold text-sm text-nilami-text">
            Bid History ({bids.length})
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-nilami-green-dark bg-nilami-green-subtle px-2.5 py-1 rounded-full border border-nilami-border-strong">
          <span className="w-1.5 h-1.5 rounded-full bg-nilami-green-dark animate-pulse" />
          <span>Real-time Stream</span>
        </div>
      </div>

      {isLoading && bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-nilami-text-muted">
          Loading bids...
        </div>
      ) : bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-nilami-text-muted bg-nilami-ivory-surface rounded-2xl border border-nilami-border-subtle">
          No bids placed yet. Be the first to bid!
        </div>
      ) : (
        <div className="divide-y divide-nilami-border/60 max-h-80 overflow-y-auto pr-1">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`py-3 flex items-center justify-between text-xs transition-colors ${
                index === 0
                  ? 'bg-nilami-green-subtle -mx-2 px-3 rounded-xl border border-nilami-border-strong'
                  : ''
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-nilami-text">
                    {bid.bidderMasked}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-green-dark text-white shadow-sm">
                      Highest Bid
                    </span>
                  )}
                  {bid.extended && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-nilami-tan text-nilami-warning-dark border border-nilami-border-strong">
                      <Zap className="w-2.5 h-2.5" />
                      +30s Anti-Snipe
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-nilami-text-muted">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(bid.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-black text-sm text-nilami-text">
                  {formatINR(bid.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
