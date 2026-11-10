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
    <div className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-6 border border-nilami-border dark:border-nilami-dark-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-nilami-green-dark dark:text-nilami-sand" />
          <h3 className="font-display font-bold text-sm text-nilami-text dark:text-nilami-dark-text">
            Bid History ({bids.length})
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-nilami-green-dark dark:text-nilami-sand bg-nilami-green-subtle/70 dark:bg-nilami-green-dark/30 px-2.5 py-1 rounded-full border border-nilami-green/30">
          <span className="w-1.5 h-1.5 rounded-full bg-nilami-green animate-pulse" />
          <span>Real-time Stream</span>
        </div>
      </div>

      {isLoading && bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50">
          Loading bids...
        </div>
      ) : bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50 bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated rounded-2xl border border-nilami-border/50">
          No bids placed yet. Be the first to bid!
        </div>
      ) : (
        <div className="divide-y divide-nilami-border/40 dark:divide-nilami-dark-border/40 max-h-80 overflow-y-auto pr-1">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`py-3 flex items-center justify-between text-xs transition-colors ${
                index === 0
                  ? 'bg-nilami-green-subtle/50 dark:bg-nilami-green-dark/20 -mx-2 px-3 rounded-xl border border-nilami-green/20'
                  : ''
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-nilami-text dark:text-nilami-dark-text">
                    {bid.bidderMasked}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-green-dark text-white shadow-sm">
                      Highest Bid
                    </span>
                  )}
                  {bid.extended && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300">
                      <Zap className="w-2.5 h-2.5" />
                      +30s Anti-Snipe
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-nilami-text/50 dark:text-nilami-dark-text/50">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(bid.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-black text-sm text-nilami-text dark:text-nilami-dark-text">
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
