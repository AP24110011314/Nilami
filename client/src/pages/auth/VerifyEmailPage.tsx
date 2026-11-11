import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Verification token is missing in the URL.');
      return;
    }

    const verify = async () => {
      try {
        await apiClient.verifyEmail(token);
        setSuccess(true);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to verify email. The token may be expired or invalid.');
        }
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="max-w-md mx-auto my-12 bg-nilami-sand-surface rounded-3xl p-8 border border-nilami-border shadow-xl text-center space-y-6">
      {loading && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 text-nilami-green-dark animate-spin mx-auto" />
          <h2 className="font-display font-black text-xl text-nilami-text">
            Verifying Email Address...
          </h2>
          <p className="text-xs text-nilami-text-muted">
            Please wait while we confirm your account tokens.
          </p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-nilami-green-subtle text-nilami-green-dark rounded-full flex items-center justify-center mx-auto border border-nilami-border-strong">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-2xl text-nilami-text">
            Email Verified!
          </h2>
          <p className="text-xs text-nilami-text-secondary leading-relaxed">
            Your email has been successfully verified. You are now authorized to participate in live bidding and list items.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition shadow-sm"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4 text-nilami-tan" />
          </Link>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-nilami-danger-subtle text-nilami-danger-dark rounded-full flex items-center justify-center mx-auto border border-nilami-danger-border">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-xl text-nilami-text">
            Verification Failed
          </h2>
          <p className="text-xs text-nilami-danger-dark font-medium">{error}</p>
          <Link
            to="/register"
            className="inline-block w-full py-3 px-4 rounded-xl bg-nilami-sand hover:bg-nilami-sand/80 text-nilami-text font-bold text-xs border border-nilami-border transition"
          >
            Back to Registration
          </Link>
        </div>
      )}
    </div>
  );
};
