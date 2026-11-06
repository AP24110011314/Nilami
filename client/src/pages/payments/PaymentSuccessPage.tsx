import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { apiClient } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { CheckCircle2, Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const auctionId = searchParams.get('auction') || '';
  const isMock = searchParams.get('mock') === 'true';

  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [amount, setAmount] = useState<number>(0);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingMock, setCompletingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!auctionId) return;
    try {
      const res = await apiClient.getPaymentStatus(auctionId);
      setPaymentStatus(res.status);
      setAmount(res.amount);
      if (res.paidAt) setPaidAt(res.paidAt);
    } catch {
      // Keep polling
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkStatus();

    const interval = setInterval(() => {
      if (paymentStatus !== 'succeeded') {
        void checkStatus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [checkStatus, paymentStatus]);

  const handleMockComplete = async () => {
    if (!auctionId) return;
    setCompletingMock(true);
    setError(null);
    try {
      await apiClient.mockCompletePayment(auctionId);
      await checkStatus();
    } catch {
      setError('Failed to complete mock payment');
    } finally {
      setCompletingMock(false);
    }
  };

  if (!auctionId) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Invalid Payment Link</h2>
        <p className="text-xs text-slate-500">No auction identifier was provided.</p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Checking payment settlement...</p>
      </div>
    );
  }

  const isSucceeded = paymentStatus === 'succeeded';

  return (
    <div className="max-w-lg mx-auto my-12">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        {isSucceeded ? (
          <>
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-slate-900">Payment Succeeded!</h1>
              <p className="text-xs text-slate-500">
                Your payment has been verified by the bank webhook and the auction is now completed.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Amount Paid</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatINR(amount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Payment Method</span>
                <span className="font-semibold text-slate-700">INR Direct Settlement</span>
              </div>
              {paidAt && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Settled At</span>
                  <span className="font-mono text-slate-700">{new Date(paidAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50/60 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span>Seller notified — item will be dispatched</span>
            </div>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>Go to My Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto border-2 border-indigo-200">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">Confirming Payment...</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Waiting for the official bank / Stripe webhook to confirm transaction settlement. Do not close this window.
              </p>
            </div>

            {isMock && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[11px] text-amber-600 font-medium">
                  Running in Demo/Mock Mode: simulate instant webhook callback
                </p>
                <button
                  onClick={handleMockComplete}
                  disabled={completingMock}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {completingMock ? 'Simulating...' : 'Complete Mock Payment Instantly'}
                </button>
                {error && <p className="text-xs text-rose-600">{error}</p>}
              </div>
            )}

            <div className="pt-2 text-center">
              <Link to={`/auctions/${auctionId}`} className="text-xs text-indigo-600 font-medium hover:underline">
                Return to Auction
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
