import React, { useEffect, useState } from 'react';
import { apiClient, type HealthResponse } from '../api/client.js';
import { CheckCircle2, XCircle, Database, Server, Clock, RefreshCw } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            Phase 0 Foundation Active
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Nilami Real-Time Bidding Platform
          </h1>
          <p className="text-indigo-200 text-base sm:text-lg leading-relaxed">
            High-concurrency auction engine engineered with atomic state transitions, server-authoritative
            countdown clocks, BullMQ background jobs, and webhook-verified Stripe payments.
          </p>
        </div>
      </section>

      {/* System Health Status Grid */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">System Infrastructure Status</h2>
            <p className="text-sm text-slate-500">Live health verification against API (port 4000)</p>
          </div>
          <button
            onClick={() => void fetchHealth()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50 cursor-pointer"
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
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
                    <span className="text-base font-bold text-slate-800">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-bold text-slate-800">
                      {loading ? 'Checking...' : 'Disconnected'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
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
                    <span className="text-base font-bold text-slate-800">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-bold text-slate-800">
                      {loading ? 'Checking...' : 'Disconnected'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Server Authoritative Time
                </span>
                <span className="font-mono text-[11px] text-slate-400">ISO 8601</span>
              </div>
              <p className="text-xs font-mono text-slate-700 truncate">
                {health?.serverTime || (loading ? 'Synchronizing...' : 'Unavailable')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Process Uptime</span>
                <span className="font-mono text-[11px] text-slate-400">API</span>
              </div>
              <p className="text-base font-bold text-slate-800 font-mono">
                {health ? `${Math.floor(health.uptime)}s` : loading ? '...' : '0s'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
