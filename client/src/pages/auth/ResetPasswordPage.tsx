import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Gavel } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Reset token is missing in the URL.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 bg-nilami-sand-surface rounded-3xl p-8 border border-nilami-border shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-nilami-green-subtle text-nilami-green-dark rounded-full flex items-center justify-center mx-auto border border-nilami-border-strong">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-2xl text-nilami-text">
            Password Changed!
          </h2>
          <p className="text-xs text-nilami-text-secondary leading-relaxed">
            Your password has been successfully updated. All previous sessions have been revoked for your security. Redirecting to sign in...
          </p>
        </div>
        <Link
          to="/login"
          className="inline-block w-full py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition shadow-sm"
        >
          Proceed to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 bg-nilami-sand-surface rounded-3xl p-8 border border-nilami-border shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-nilami-green-dark text-white flex items-center justify-center mx-auto shadow-sm">
          <Gavel className="w-6 h-6 text-nilami-tan" />
        </div>
        <h1 className="font-display font-black text-2xl text-nilami-text tracking-tight">
          Set New Password
        </h1>
        <p className="text-xs text-nilami-text-muted">
          Choose a strong password (minimum 8 characters)
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-nilami-danger-subtle border border-nilami-danger-border text-nilami-danger-dark flex items-center gap-2.5 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text-muted">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-nilami-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nilami-ivory-surface border border-nilami-border text-sm text-nilami-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text-muted">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-nilami-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nilami-ivory-surface border border-nilami-border text-sm text-nilami-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
          <ArrowRight className="w-4 h-4 text-nilami-tan" />
        </button>
      </form>
    </div>
  );
};
