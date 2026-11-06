import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  History,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { apiClient, type AdminFraudFlag } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';

interface AdminStats {
  gmv: number;
  activeAuctionsCount: number;
  totalBidsCount: number;
  openFraudFlagsCount: number;
  paymentFailureRate: number;
}

interface AuditLogItem {
  _id: string;
  adminId: { name: string; email: string };
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ip: string;
  createdAt: string;
}

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fraud' | 'audit'>('fraud');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [flags, setFlags] = useState<AdminFraudFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, flagsRes, logsRes] = await Promise.all([
        apiClient.getAdminAnalyticsOverview(),
        apiClient.getAdminFraudFlags('open'),
        apiClient.getAdminAuditLogs(1, 20),
      ]);
      setStats(statsRes);
      setFlags(flagsRes.flags);
      setAuditLogs(logsRes.logs);
    } catch {
      // Soft fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAdminData();
  }, []);

  const handleReviewFlag = async (flagId: string, status: 'confirmed' | 'dismissed') => {
    setActionLoading(flagId);
    try {
      await apiClient.reviewAdminFraudFlag(flagId, status, `Reviewed via Admin Dashboard (${status})`);
      setFlags((prev) => prev.filter((f) => f._id !== flagId));
      if (stats) {
        setStats({ ...stats, openFraudFlagsCount: Math.max(0, stats.openFraudFlagsCount - 1) });
      }
    } catch {
      alert(`Failed to ${status} fraud flag`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin & Security Console</h1>
          <p className="text-xs text-slate-500 mt-1">Platform monitoring, explainable fraud flags, and audit trail</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <ShieldAlert className="w-4 h-4" />
          <span>Real-time Risk Guard</span>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total GMV</span>
            <p className="text-xl font-black text-slate-900">{formatINR(stats.gmv)}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Active Lots</span>
            <p className="text-xl font-black text-indigo-600">{stats.activeAuctionsCount}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Bids Placed</span>
            <p className="text-xl font-black text-slate-900">{stats.totalBidsCount}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Open Risk Flags</span>
            <p
              className={`text-xl font-black ${
                stats.openFraudFlagsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
              }`}
            >
              {stats.openFraudFlagsCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Payment Failure</span>
            <p className="text-xl font-black text-slate-900">{stats.paymentFailureRate}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('fraud')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'fraud' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Fraud Review Queue</span>
          {flags.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
              {flags.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Admin Audit Logs</span>
        </button>
      </div>

      {/* Fraud Queue Tab */}
      {activeTab === 'fraud' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Open Risk Detections</h2>
            <span className="text-xs text-slate-500">Explainable rule-based scoring</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading risk flags...</div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Fraud Queue Clear</p>
              <p className="text-xs text-slate-400">No open risk flags requiring manual moderator review.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {flags.map((flag) => (
                <div key={flag._id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        {flag.type}
                      </span>
                      <span className="text-xs font-black text-rose-600">
                        Risk Score: {flag.score}/100
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>
                        User: <strong className="text-slate-900">{flag.subjectUserId?.name}</strong> ({flag.subjectUserId?.email})
                      </p>
                      {flag.auctionId && (
                        <p>
                          Auction: <strong className="text-slate-900">{flag.auctionId.title}</strong>
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-slate-500">
                        Evidence: {JSON.stringify(flag.evidence)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReviewFlag(flag._id, 'dismissed')}
                      disabled={actionLoading === flag._id}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>

                    <button
                      onClick={() => handleReviewFlag(flag._id, 'confirmed')}
                      disabled={actionLoading === flag._id}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      {actionLoading === flag._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Confirm & Suspend</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Administrator Activity Log</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{log.targetType}: {log.targetId}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    By: <strong>{log.adminId?.name || 'Admin'}</strong> from IP {log.ip}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
