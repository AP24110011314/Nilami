import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { rupeesToPaise, paiseToRupees } from '../../lib/money.js';
import { AlertCircle, ArrowRight, Loader2, Gavel } from 'lucide-react';

export const EditAuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<
    'electronics' | 'collectibles' | 'art' | 'fashion' | 'vehicles' | 'other'
  >('electronics');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used_good' | 'used_fair'>('new');
  const [startingPriceRupees, setStartingPriceRupees] = useState('');
  const [minIncrementRupees, setMinIncrementRupees] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAuction = async () => {
      try {
        const res = await apiClient.getAuction(id);
        const a = res.auction;
        if (a.bidCount > 0) {
          setError('This auction has active bids and can no longer be edited.');
        }
        setAuction(a);
        setTitle(a.title);
        setDescription(a.description);
        setCategory(a.category);
        setCondition(a.condition);
        setStartingPriceRupees(String(paiseToRupees(a.startingPrice)));
        setMinIncrementRupees(String(paiseToRupees(a.minIncrement)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load auction.');
      } finally {
        setLoading(false);
      }
    };

    void fetchAuction();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);

    try {
      const startingPrice = rupeesToPaise(startingPriceRupees);
      const minIncrement = rupeesToPaise(minIncrementRupees);

      const payload = {
        title,
        description,
        category,
        condition,
        startingPrice,
        minIncrement,
      };

      await apiClient.updateAuction(id, payload);
      navigate(`/auctions/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update auction.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-nilami-green-dark animate-spin mx-auto" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-2xl border border-nilami-border text-center">
        <p className="text-sm text-nilami-text/70">{error || 'Auction not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-6 sm:p-10 border border-nilami-border dark:border-nilami-dark-border shadow-xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-nilami-green-dark dark:text-nilami-sand" />
          <h1 className="font-display font-black text-2xl text-nilami-text dark:text-nilami-dark-text tracking-tight">
            Edit Auction Lot
          </h1>
        </div>
        <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          Modify lot details before the first competitive bid is placed
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark dark:text-nilami-danger-light flex items-center gap-2.5 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {auction.bidCount > 0 ? (
        <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          Rule FR-B2: Once a bid has been accepted, seller modifications are locked to preserve bidding integrity.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Title
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
              >
                <option value="electronics">Electronics</option>
                <option value="collectibles">Collectibles</option>
                <option value="art">Art & Antiques</option>
                <option value="fashion">Fashion & Luxury</option>
                <option value="vehicles">Vehicles & Automotive</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
              >
                <option value="new">Brand New</option>
                <option value="like_new">Like New / Mint</option>
                <option value="used_good">Used — Good Condition</option>
                <option value="used_fair">Used — Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Description
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
                Starting Price (₹)
              </label>
              <input
                type="text"
                required
                value={startingPriceRupees}
                onChange={(e) => setStartingPriceRupees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm font-bold text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
                Min Increment (₹)
              </label>
              <input
                type="text"
                required
                value={minIncrementRupees}
                onChange={(e) => setMinIncrementRupees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm font-bold text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Saving changes...' : 'Save Lot Changes'}</span>
            <ArrowRight className="w-4 h-4 text-nilami-sand" />
          </button>
        </form>
      )}
    </div>
  );
};
