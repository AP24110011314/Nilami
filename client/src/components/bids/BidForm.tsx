import React, { useState, useEffect } from 'react';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { paiseToRupees, rupeesToPaise, formatINR } from '../../lib/money.js';
import { useAuthStore } from '../../store/auth.js';
import { Gavel, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface BidFormProps {
  auction: AuctionItem;
  onBidSuccess?: (updatedAuction: AuctionItem) => void;
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
  const isHighestBidder = Boolean(user && auction.highestBidderId === user.id);

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
      onBidSuccess?.(res.auction);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
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
      <div className="p-4 rounded-2xl bg-nilami-sand-light border border-nilami-border text-xs text-nilami-text-secondary text-center">
        You are the seller of this auction lot. Self-bidding is strictly prohibited.
      </div>
    );
  }

  if (isHighestBidder) {
    return (
      <div className="p-4 rounded-2xl bg-nilami-green-subtle border border-nilami-border-strong text-nilami-green-dark space-y-1.5 text-center">
        <div className="flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-nilami-green-dark" />
          <span>You are currently the highest bidder</span>
        </div>
        <p className="text-xs opacity-90">
          Your bid of <strong className="font-bold">{formatINR(auction.currentPrice)}</strong> leads this auction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fat finger confirmation modal / alert */}
      {showFatFingerConfirm && (
        <div className="p-4 rounded-2xl bg-nilami-tan/65 border-2 border-nilami-border-strong text-nilami-text space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-nilami-warning-dark shrink-0" />
            <h4 className="font-bold text-xs">High Bid Confirmation</h4>
          </div>
          <p className="text-xs leading-relaxed">
            Your bid of <strong>₹{parseFloat(amountRupees).toLocaleString('en-IN')}</strong> is more than double the current price ({formatINR(auction.currentPrice)}). Are you sure you want to proceed?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void executeBid()}
              disabled={submitting}
              className="flex-1 py-2 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white text-xs font-bold transition cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Yes, Confirm Bid'}
            </button>
            <button
              type="button"
              onClick={() => setShowFatFingerConfirm(false)}
              className="px-4 py-2 rounded-xl bg-nilami-sand hover:bg-nilami-sand/80 text-xs font-semibold text-nilami-text transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div>
          <label htmlFor="bid-amount-input" className="block text-xs font-bold text-nilami-text mb-1">
            Your Bid (₹ INR)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-nilami-text-muted">
              ₹
            </span>
            <input
              id="bid-amount-input"
              type="number"
              min={minNextRupees}
              step={minIncrementRupees}
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              disabled={submitting}
              className="w-full pl-8 pr-4 py-3 rounded-2xl bg-nilami-ivory-surface border-2 border-nilami-border focus:border-nilami-green-dark text-lg font-mono font-black text-nilami-text focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Increment Buttons */}
        <div className="flex gap-2">
          {[1, 2, 5].map((multiplier) => (
            <button
              key={multiplier}
              type="button"
              onClick={() => handleQuickAdd(multiplier)}
              disabled={submitting}
              className="flex-1 py-1.5 rounded-xl bg-nilami-sand/60 hover:bg-nilami-sand border border-nilami-border text-xs font-semibold text-nilami-text transition cursor-pointer"
            >
              +{formatINR(auction.minIncrement * multiplier)}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-nilami-danger-subtle border border-nilami-danger-border text-nilami-danger-dark text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-nilami-green-subtle border border-nilami-border-strong text-nilami-green-dark text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-nilami-green-dark shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-nilami-green-dark hover:bg-nilami-green-pressed active:scale-[0.99] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transacting Bid...</span>
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4 text-nilami-sand" />
              <span>Place Bid of ₹{parseFloat(amountRupees || '0').toLocaleString('en-IN')}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
