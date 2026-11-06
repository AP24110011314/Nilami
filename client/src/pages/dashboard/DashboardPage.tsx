import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth.js';
import { apiClient, ApiError } from '../../api/client.js';
import { User, CheckCircle2, AlertTriangle, Store, Gavel, Award, TrendingUp } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [becomingSeller, setBecomingSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!user) return null;

  const isSeller = user.roles.includes('seller');
  const isVerified = Boolean(user.emailVerifiedAt);

  const handleBecomeSeller = async () => {
    setError(null);
    setSuccessMsg(null);
    setBecomingSeller(true);

    try {
      const res = await apiClient.becomeSeller();
      setUser(res.user);
      setSuccessMsg('You are now registered as a Nilami Seller!');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to enable seller account');
      }
    } finally {
      setBecomingSeller(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unverified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex gap-2 mt-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          {!isSeller && (
            <button
              onClick={handleBecomeSeller}
              disabled={becomingSeller || !isVerified}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>{becomingSeller ? 'Activating...' : 'Become a Seller'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {successMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>BIDS PLACED</span>
            <Gavel className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{user.stats.bidsPlaced}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AUCTIONS WON</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{user.stats.auctionsWon}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AUCTIONS SOLD</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{user.stats.auctionsSold}</p>
        </div>
      </div>
    </div>
  );
};
