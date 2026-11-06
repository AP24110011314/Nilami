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
import { formatINR } from '../../lib/money.js';
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
    return <div className="h-44 flex items-center justify-center text-xs text-slate-400">Loading lot analytics...</div>;
  }

  if (!data || data.priceProgression.length <= 1) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
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
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Price Progression</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <strong>{data.uniqueBidders}</strong> bidders
          </span>
          {data.extensionCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <strong>{data.extensionCount}</strong> anti-snipes
            </span>
          )}
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
            />
            <Tooltip
              formatter={(val: number | string | readonly (string | number)[] | undefined) => [
                typeof val === 'number' || typeof val === 'string' ? formatINR(Number(val) * 100) : '',
                'Price',
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                backgroundColor: '#0f172a',
                color: '#fff',
                borderRadius: '0.75rem',
                fontSize: '12px',
                border: 'none',
              }}
            />
            <Area
              type="monotone"
              dataKey="priceRupees"
              stroke="#4f46e5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
