import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../api/client.js';
import { TrendingUp, Users, Zap } from 'lucide-react';

interface AuctionPriceChartProps {
  auctionId: string;
}

export const AuctionPriceChart: React.FC<AuctionPriceChartProps> = ({ auctionId }) => {
  const [data, setData] = useState<{
    currentPrice: number;
    extensionCount: number;
    uniqueBidders: number;
    priceProgression: Array<{ t: string; amount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getAuctionAnalytics(auctionId)
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auctionId]);

  if (loading) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-nilami-text-muted">
        Loading lot price trajectory...
      </div>
    );
  }

  if (!data || data.priceProgression.length <= 1) {
    return (
      <div className="p-4 rounded-2xl bg-nilami-sand-surface border border-nilami-border text-xs text-nilami-text-secondary text-center">
        No bids recorded yet. Bids placed on this lot will generate live price analytics.
      </div>
    );
  }

  const chartData = data.priceProgression.map((item, index) => ({
    step: index === 0 ? 'Start' : `Bid #${index}`,
    time: new Date(item.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    priceRupees: Math.round(item.amount / 100),
    amount: item.amount,
  }));

  return (
    <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-nilami-green-dark" />
          <h3 className="text-sm font-display font-bold text-nilami-text">
            Price Progression
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-nilami-text-secondary">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-nilami-tan-dark" />
            <strong className="text-nilami-text">{data.uniqueBidders}</strong> bidders
          </span>
          {data.extensionCount > 0 && (
            <span className="flex items-center gap-1 text-nilami-warning-dark font-bold">
              <Zap className="w-3.5 h-3.5" />
              <strong>{data.extensionCount}</strong> anti-snipes
            </span>
          )}
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nilamiPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--nilami-green-dark)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--nilami-green)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="step" tick={{ fontSize: 10, fill: 'var(--nilami-text-muted)' }} />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--nilami-text-muted)' }}
              tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
            />
            <Tooltip
              formatter={(val: number | string | readonly (string | number)[] | undefined) => [
                typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : String(val),
                'Amount',
              ]}
              labelFormatter={(label) => `Stage: ${String(label)}`}
              contentStyle={{
                backgroundColor: 'var(--nilami-ivory)',
                border: '1px solid var(--nilami-border-strong)',
                borderRadius: '12px',
                fontSize: '11px',
                color: 'var(--nilami-text)',
                fontWeight: 'bold',
              }}
            />
            <Area
              type="monotone"
              dataKey="priceRupees"
              stroke="var(--nilami-green-dark)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#nilamiPriceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
