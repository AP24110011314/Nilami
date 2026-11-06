import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
      {loading && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Verifying Email Address...</h2>
          <p className="text-xs text-slate-500">Please wait while we confirm your account.</p>
        </div>
      )}

      {!loading && success && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
          <p className="text-sm text-slate-600">
            Your email has been successfully verified. You are now authorized to place bids and create auctions.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
          >
            Sign In to Continue
          </Link>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verification Failed</h2>
          <p className="text-sm text-rose-600">{error}</p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-block py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              Back to Registration
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

