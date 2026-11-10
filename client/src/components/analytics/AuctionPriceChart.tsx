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
      <div className="h-44 flex items-center justify-center text-xs text-nilami-text/40 dark:text-nilami-dark-text/40">
        Loading lot price trajectory...
      </div>
    );
  }

  if (!data || data.priceProgression.length <= 1) {
    return (
      <div className="p-4 rounded-2xl bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated border border-nilami-border/60 dark:border-nilami-dark-border text-xs text-nilami-text/60 dark:text-nilami-dark-text/60 text-center">
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
    <div className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-6 border border-nilami-border dark:border-nilami-dark-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-nilami-green-dark dark:text-nilami-sand" />
          <h3 className="text-sm font-display font-bold text-nilami-text dark:text-nilami-dark-text">
            Price Progression
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-nilami-tan" />
            <strong className="text-nilami-text dark:text-nilami-dark-text">{data.uniqueBidders}</strong> bidders
          </span>
          {data.extensionCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
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
                <stop offset="5%" stopColor="#5D866C" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5D866C" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#7C8A82' }} />
            <YAxis
              tick={{ fontSize: 10, fill: '#7C8A82' }}
              tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
            />
            <Tooltip
              formatter={(val: number | string | readonly (string | number)[] | undefined) => [
                typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : String(val),
                'Amount',
              ]}
              labelFormatter={(label) => `Stage: ${String(label)}`}
              contentStyle={{
                backgroundColor: '#F5F5F0',
                border: '1px solid #C2A68C',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#1F2A24',
                fontWeight: 'bold',
              }}
            />
            <Area
              type="monotone"
              dataKey="priceRupees"
              stroke="#3F5F4B"
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
