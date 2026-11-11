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
          <h1 className="font-display font-black text-2xl sm:text-3xl text-nilami-text tracking-tight">
            Admin & Security Console
          </h1>
          <p className="text-xs text-nilami-text-muted mt-1">
            Platform monitoring, explainable fraud rule detections, and authoritative audit trail
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nilami-green-subtle border border-nilami-border-strong text-nilami-green-dark text-xs font-bold">
          <ShieldAlert className="w-4 h-4 text-nilami-green-dark" />
          <span>Risk Rule Engine Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text-muted">
              Total GMV
            </span>
            <p className="text-xl font-black text-nilami-text font-mono">
              {formatINR(stats.gmv)}
            </p>
          </div>

          <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text-muted">
              Active Lots
            </span>
            <p className="text-xl font-black text-nilami-green-dark font-mono">
              {stats.activeAuctionsCount}
            </p>
          </div>

          <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text-muted">
              Bids Placed
            </span>
            <p className="text-xl font-black text-nilami-text font-mono">
              {stats.totalBidsCount}
            </p>
          </div>

          <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text-muted">
              Open Risk Flags
            </span>
            <p
              className={`text-xl font-black font-mono ${
                stats.openFraudFlagsCount > 0
                  ? 'text-nilami-danger-dark animate-pulse'
                  : 'text-nilami-green-dark'
              }`}
            >
              {stats.openFraudFlagsCount}
            </p>
          </div>

          <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text-muted">
              Payment Failure
            </span>
            <p className="text-xl font-black text-nilami-text font-mono">
              {stats.paymentFailureRate}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-nilami-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('fraud')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'fraud'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Fraud Review Queue</span>
          {flags.length > 0 && (
            <span className="px-1.5 py-0.2 bg-nilami-danger-dark text-white rounded-full text-[10px]">
              {flags.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Admin Audit Logs</span>
        </button>
      </div>

      {/* Fraud Queue Tab */}
      {activeTab === 'fraud' && (
        <div className="bg-nilami-sand-surface rounded-3xl border border-nilami-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-nilami-border/60 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-nilami-text">
              Open Risk Detections
            </h2>
            <span className="text-xs text-nilami-text/50">
              Explainable rule-based scoring (threshold 60 = flag, 70 = bid block)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-nilami-text/50">Loading risk flags...</div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-nilami-green-dark mx-auto" />
              <p className="font-display font-bold text-sm text-nilami-text">
                Fraud Queue Clear
              </p>
              <p className="text-xs text-nilami-text/50">No open risk flags requiring manual moderator review.</p>
            </div>
          ) : (
            <div className="divide-y divide-nilami-border/40">
              {flags.map((flag) => (
                <div
                  key={flag._id}
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-nilami-sand/30 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-danger-subtle text-nilami-danger-dark border border-nilami-danger/30">
                        {flag.type}
                      </span>
                      <span className="text-xs font-black text-nilami-danger-dark font-mono">
                        Risk Score: {flag.score}/100
                      </span>
                    </div>

                    <div className="text-xs text-nilami-text/80 space-y-0.5">
                      <p>
                        User:{' '}
                        <strong className="text-nilami-text font-bold">
                          {flag.subjectUserId?.name}
                        </strong>{' '}
                        ({flag.subjectUserId?.email})
                      </p>
                      {flag.auctionId && (
                        <p>
                          Auction:{' '}
                          <strong className="text-nilami-text font-bold">
                            {flag.auctionId.title}
                          </strong>
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-nilami-text/60">
                        Evidence: {JSON.stringify(flag.evidence)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReviewFlag(flag._id, 'dismissed')}
                      disabled={actionLoading === flag._id}
                      className="px-3.5 py-2 bg-nilami-sand hover:bg-nilami-sand/80 text-nilami-text rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-nilami-border"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReviewFlag(flag._id, 'confirmed')}
                      disabled={actionLoading === flag._id}
                      className="px-4 py-2 bg-nilami-danger-dark hover:bg-nilami-danger text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
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
        <div className="bg-nilami-sand-surface rounded-3xl border border-nilami-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-nilami-border/60">
            <h2 className="font-display font-bold text-sm text-nilami-text">
              Administrator Activity Log
            </h2>
          </div>

          <div className="divide-y divide-nilami-border/40">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-nilami-text">{log.action}</span>
                    <span className="text-nilami-text/40">•</span>
                    <span className="text-nilami-text/70">
                      {log.targetType}: {log.targetId}
                    </span>
                  </div>
                  <p className="text-nilami-text/60 mt-0.5">
                    By:{' '}
                    <strong className="text-nilami-text">
                      {log.adminId?.name || 'Admin'}
                    </strong>{' '}
                    from IP {log.ip}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-nilami-text/50 shrink-0">
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
