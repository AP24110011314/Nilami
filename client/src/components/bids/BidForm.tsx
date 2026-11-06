import React, { useState, useEffect } from 'react';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { paiseToRupees, rupeesToPaise, formatINR } from '../../lib/money.js';
import { useAuthStore } from '../../store/auth.js';
import { Gavel, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface BidFormProps {
  auction: AuctionItem;
  onBidSuccess: (updatedAuction: AuctionItem) => void;
}

export const BidForm: React.FC<BidFormProps> = ({ auction, onBidSuccess }) => {
  const { user } = useAuthStore();

  const minNextRupees = paiseToRupees(auction.minNextBid);
  const minIncrementRupees = paiseToRupees(auction.minIncrement);

  const [amountRupees, setAmountRupees] = useState<string>(String(minNextRupees));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showFatFingerConfirm, setShowFatFingerConfirm] = useState(false);

  // Sync input when minNextBid changes
  useEffect(() => {
    setAmountRupees(String(paiseToRupees(auction.minNextBid)));
  }, [auction.minNextBid]);

  const isSeller = user && user.id === auction.sellerId;
  const isHighestBidder = false; // Phase 4 will track this live via socket
  const isVerified = Boolean(user?.emailVerifiedAt);

  const handleQuickAdd = (multiplier: number) => {
    const currentVal = parseFloat(amountRupees) || minNextRupees;
    const added = currentVal + minIncrementRupees * multiplier;
    setAmountRupees(String(Math.round(added)));
  };

  const executeBid = async () => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const amountPaise = rupeesToPaise(amountRupees);
      const idempotencyKey = crypto.randomUUID();

      const res = await apiClient.placeBid(auction.id, amountPaise, idempotencyKey);
      setSuccessMsg(`Bid of ${formatINR(res.bid.amount)} placed successfully!`);
      onBidSuccess(res.auction);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // If error included updated minNextBid in details, adjust form input
        const details = err.details as { minNextBid?: number } | undefined;
        if (details?.minNextBid) {
          setAmountRupees(String(paiseToRupees(details.minNextBid)));
        }
      } else {
        setError('Failed to place bid. Please try again.');
      }
    } finally {
      setSubmitting(false);
      setShowFatFingerConfirm(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedPaise: number;
    try {
      parsedPaise = rupeesToPaise(amountRupees);
    } catch {
      setError('Please enter a valid rupee amount.');
      return;
    }

    if (parsedPaise < auction.minNextBid) {
      setError(`Minimum allowed bid is ${formatINR(auction.minNextBid)}.`);
      return;
    }

    // Fat-finger check (PRD.md §3): prompt confirmation if > 2x current price
    if (parsedPaise > auction.currentPrice * 2) {
      setShowFatFingerConfirm(true);
      return;
    }

    void executeBid();
  };

  if (isSeller) {
    return (
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 text-center">
        You are the seller of this auction lot. Self-bidding is strictly prohibited.
      </div>
    );
  }

  if (user && !isVerified) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Email Verification Required
        </p>
        <p>You must verify your email address before participating in competitive bidding.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Your Bid (₹ INR)</span>
            <span className="text-[11px] text-slate-400">Min: {formatINR(auction.minNextBid)}</span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
              ₹
            </span>
            <input
              type="text"
              required
              disabled={submitting}
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-300 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Quick Bid Increment Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleQuickAdd(1)}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            +{formatINR(auction.minIncrement)}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleQuickAdd(2)}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            +{formatINR(auction.minIncrement * 2)}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleQuickAdd(5)}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            +{formatINR(auction.minIncrement * 5)}
          </button>
        </div>

        {/* Fat-Finger Confirmation Dialog */}
        {showFatFingerConfirm && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">High Bid Confirmation</p>
                <p>
                  You are bidding <strong>{formatINR(rupeesToPaise(amountRupees))}</strong>, which is
                  more than double the current price of {formatINR(auction.currentPrice)}. Are you sure?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFatFingerConfirm(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeBid()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Confirm High Bid
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || showFatFingerConfirm || isHighestBidder}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Placing bid…</span>
            </div>
          ) : (
            <>
              <Gavel className="w-4 h-4" />
              <span>Place Authoritative Bid</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

