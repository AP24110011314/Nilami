import React, { useState } from 'react';
import { Link } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Gavel } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to request password reset. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto my-12 bg-nilami-sand-surface rounded-3xl p-8 border border-nilami-border shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-nilami-green-subtle text-nilami-green-dark rounded-full flex items-center justify-center mx-auto border border-nilami-border-strong">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-2xl text-nilami-text">
            Reset Link Dispatched
          </h2>
          <p className="text-xs text-nilami-text-secondary leading-relaxed">
            If an account exists with <strong className="text-nilami-text font-bold">{email}</strong>, check Mailpit (port 8025) for your reset token.
          </p>
        </div>
        <Link
          to="/login"
          className="inline-block w-full py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition shadow-sm"
        >
          Return to Sign In
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
          Reset Password
        </h1>
        <p className="text-xs text-nilami-text-muted">
          Enter your registered email and we&apos;ll send an authoritative recovery link
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
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-nilami-text/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nilami-ivory-surface border border-nilami-border text-sm text-nilami-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? 'Sending link...' : 'Send Recovery Link'}</span>
          <ArrowRight className="w-4 h-4 text-nilami-sand" />
        </button>
      </form>

      <div className="text-center text-xs text-nilami-text/60 pt-2 border-t border-nilami-border/60">
        Remember your password?{' '}
        <Link to="/login" className="font-bold text-nilami-green-dark hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
