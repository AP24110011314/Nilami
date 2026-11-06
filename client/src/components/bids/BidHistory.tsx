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
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900">Bid History ({bids.length})</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Stream</span>
        </div>
      </div>

      {isLoading && bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading bids...</div>
      ) : bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
          No bids placed yet. Be the first to bid!
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`py-3 flex items-center justify-between text-xs transition-colors ${
                index === 0 ? 'bg-indigo-50/40 -mx-2 px-2 rounded-xl' : ''
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-800">{bid.bidderMasked}</span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Highest Bid
                    </span>
                  )}
                  {bid.extended && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Zap className="w-2.5 h-2.5" />
                      +30s Snipe Ext
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(bid.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-900 font-mono text-sm">
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
