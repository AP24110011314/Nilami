import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { useAuthStore } from '../../store/auth.js';
import { Lock, Mail, ArrowRight, AlertCircle, Gavel } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.login({ email, password });
      setAuth(res.user, res.accessToken);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-8 border border-nilami-border dark:border-nilami-dark-border shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-nilami-green-dark text-white flex items-center justify-center mx-auto shadow-sm">
          <Gavel className="w-6 h-6 text-nilami-sand" />
        </div>
        <h1 className="font-display font-black text-2xl text-nilami-text dark:text-nilami-dark-text tracking-tight">
          Sign In to Nilami
        </h1>
        <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          Access your live bidding watchlist and dashboard
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark dark:text-nilami-danger-light flex items-center gap-2.5 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-nilami-text/40 dark:text-nilami-dark-text/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-nilami-green-dark dark:text-nilami-sand hover:underline font-semibold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-nilami-text/40 dark:text-nilami-dark-text/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4 text-nilami-sand" />
        </button>
      </form>

      <div className="text-center text-xs text-nilami-text/60 dark:text-nilami-dark-text/60 pt-2 border-t border-nilami-border/60 dark:border-nilami-dark-border/60">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-bold text-nilami-green-dark dark:text-nilami-sand hover:underline">
          Create free account
        </Link>
      </div>
    </div>
  );
};
