import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiClient, type HealthResponse, type AuctionItem } from '../api/client.js';
import { AuctionCard } from '../components/auctions/AuctionCard.js';
import { CheckCircle2, XCircle, Database, Server, Clock, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthData, auctionsData] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getAuctions({ status: 'active', limit: 4, sort: 'endingSoon' }),
      ]);
      setHealth(healthData);
      setAuctions(auctionsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 rounded-3xl p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Engine Active</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Fair, Transparent Live Bidding.
          </h1>

          <p className="text-indigo-200 text-base sm:text-lg leading-relaxed">
            Bid with confidence on authenticated electronics, rare collectibles, and fine art with
            atomic database transactions, zero race conditions, and server-authoritative countdowns.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/auctions"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition shadow-lg shadow-black/20"
            >
              <span>Explore Live Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-2xl bg-indigo-600/60 hover:bg-indigo-600 text-white font-bold text-sm border border-indigo-400/30 transition backdrop-blur-md"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      {/* Live Auctions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ending Soon</h2>
            <p className="text-xs text-slate-500">Live auctions in their final minutes of bidding</p>
          </div>
          <Link
            to="/auctions?sort=endingSoon"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {auctions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No live auctions ending soon. Check upcoming lots in catalog.
            </div>
          )
        )}
      </section>

      {/* System Health Status Grid */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">System Infrastructure Status</h2>
            <p className="text-xs text-slate-500">Continuous health telemetry from Nilami native nodes</p>
          </div>
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to connect to Nilami API</p>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  MongoDB (rs0)
                </span>
                <span className="font-mono text-[11px] text-slate-400">port 27018</span>
              </div>
              <div className="flex items-center gap-2">
                {health?.mongo === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-800">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800">
                      {loading ? 'Checking...' : 'Disconnected'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-red-500" />
                  Redis Cache / Queue
                </span>
                <span className="font-mono text-[11px] text-slate-400">port 6380</span>
              </div>
              <div className="flex items-center gap-2">
                {health?.redis === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-800">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800">
                      {loading ? 'Checking...' : 'Disconnected'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Authoritative Clock
                </span>
                <span className="font-mono text-[11px] text-slate-400">ISO 8601</span>
              </div>
              <p className="text-xs font-mono text-slate-700 truncate">
                {health?.serverTime || (loading ? 'Synchronizing...' : 'Unavailable')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Process Uptime</span>
                <span className="font-mono text-[11px] text-slate-400">API</span>
              </div>
              <p className="text-sm font-bold text-slate-800 font-mono">
                {health ? `${Math.floor(health.uptime)}s` : loading ? '...' : '0s'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
