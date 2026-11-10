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
      <div className="max-w-md mx-auto my-16 p-8 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl border border-nilami-border dark:border-nilami-dark-border text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-display font-black text-xl text-nilami-text dark:text-nilami-dark-text">
          Invalid Payment Link
        </h2>
        <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          No auction identifier was provided.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl border border-nilami-border dark:border-nilami-dark-border text-center space-y-4">
        <Loader2 className="w-8 h-8 text-nilami-green-dark animate-spin mx-auto" />
        <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          Checking payment webhook verification...
        </p>
      </div>
    );
  }

  const isSucceeded = paymentStatus === 'succeeded';

  return (
    <div className="max-w-lg mx-auto my-12">
      <div className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-8 border border-nilami-border dark:border-nilami-dark-border shadow-xl text-center space-y-6">
        {isSucceeded ? (
          <>
            <div className="w-16 h-16 bg-nilami-green-subtle text-nilami-green-dark dark:text-nilami-sand rounded-3xl flex items-center justify-center mx-auto border-2 border-nilami-green/30 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h1 className="font-display font-black text-2xl text-nilami-text dark:text-nilami-dark-text">
                Payment Succeeded!
              </h1>
              <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
                Your payment has been verified by the Stripe webhook and the lot is now marked complete.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated border border-nilami-border/60 dark:border-nilami-dark-border text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-nilami-text/60 dark:text-nilami-dark-text/60">
                <span>Amount Paid</span>
                <span className="font-bold text-nilami-text dark:text-nilami-dark-text text-sm font-mono">
                  {formatINR(amount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-nilami-text/60 dark:text-nilami-dark-text/60">
                <span>Payment Rail</span>
                <span className="font-semibold text-nilami-text dark:text-nilami-dark-text">
                  Stripe INR Direct Webhook
                </span>
              </div>
              {paidAt && (
                <div className="flex justify-between items-center text-nilami-text/60 dark:text-nilami-dark-text/60">
                  <span>Settled At</span>
                  <span className="font-mono text-nilami-text dark:text-nilami-dark-text">
                    {new Date(paidAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-nilami-green-dark dark:text-nilami-sand font-bold bg-nilami-green-subtle/80 dark:bg-nilami-green-dark/30 py-2.5 rounded-xl border border-nilami-green/30">
              <ShieldCheck className="w-4 h-4 text-nilami-green" />
              <span>Seller notified — item will be dispatched under escrow protection</span>
            </div>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="w-full py-3.5 px-4 rounded-2xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <span>Go to My Dashboard</span>
                <ArrowRight className="w-4 h-4 text-nilami-sand" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-nilami-sand dark:bg-nilami-dark-surface-elevated text-nilami-green-dark dark:text-nilami-sand rounded-3xl flex items-center justify-center mx-auto border-2 border-nilami-border">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display font-black text-xl text-nilami-text dark:text-nilami-dark-text">
                Confirming Webhook Settlement...
              </h1>
              <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60 leading-relaxed">
                Waiting for the official Stripe webhook to confirm transaction settlement. Never trust client redirects alone.
              </p>
            </div>

            {isMock && (
              <div className="pt-4 border-t border-nilami-border/60 dark:border-nilami-dark-border/60 space-y-3">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  Demo Mode: simulate instant webhook callback
                </p>
                <button
                  type="button"
                  onClick={handleMockComplete}
                  disabled={completingMock}
                  className="w-full py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {completingMock ? 'Simulating...' : 'Complete Mock Webhook Instantly'}
                </button>
                {error && <p className="text-xs text-nilami-danger-dark">{error}</p>}
              </div>
            )}

            <div className="pt-2 text-center">
              <Link
                to={`/auctions/${auctionId}`}
                className="text-xs text-nilami-green-dark dark:text-nilami-sand font-bold hover:underline"
              >
                Return to Auction Lot
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
