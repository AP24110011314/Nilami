import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { Gavel, Clock, RefreshCw, Zap } from 'lucide-react';

interface BidItem {
  id: string;
  amount: number;
  bidderMasked: string;
  createdAt: string;
  extended: boolean;
}

interface BidHistoryProps {
  auctionId: string;
  onNewBidCount?: (count: number) => void;
}

export const BidHistory: React.FC<BidHistoryProps> = ({ auctionId, onNewBidCount }) => {
  const [bids, setBids] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const fetchBids = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.getAuctionBids(auctionId, 1, 30);
      setBids(res.items);
      onNewBidCount?.(res.total);
    } catch {
      // Ignore polling errors
    } finally {
      if (!silent) setLoading(false);
    }
  }, [auctionId, onNewBidCount]);

  useEffect(() => {
    void fetchBids(false);

    // Polling refresh every 3 seconds for Phase 3 (Socket.IO replaces this in Phase 4)
    const interval = setInterval(() => {
      setIsPolling(true);
      void fetchBids(true).finally(() => setIsPolling(false));
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchBids]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900">Bid History ({bids.length})</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Auto-refreshing</span>
        </div>
      </div>

      {loading && bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading bids...</div>
      ) : bids.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
          No bids placed yet. Be the first to bid!
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
          {bids.map((bid, index) => (
            <div key={bid.id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-800">{bid.bidderMasked}</span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Highest Bid
                    </span>
                  )}
                  {bid.extended && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Zap className="w-2.5 h-2.5" />
                      +30s
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(bid.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-extrabold text-slate-900 text-sm">{formatINR(bid.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

