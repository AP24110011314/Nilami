import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { rupeesToPaise, paiseToRupees } from '../../lib/money.js';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const EditAuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'electronics' | 'collectibles' | 'art' | 'fashion' | 'vehicles' | 'other'>('electronics');
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
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border text-center">
        <p className="text-sm text-slate-600">{error || 'Auction not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Auction Lot</h1>
        <p className="text-sm text-slate-500">Edit listing specifications before first bid is placed</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {auction.bidCount > 0 ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm">
          Rule FR-B2: Once a bid has been accepted, seller edits are disabled to ensure buyer trust.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="electronics">Electronics</option>
                <option value="collectibles">Collectibles</option>
                <option value="art">Art</option>
                <option value="fashion">Fashion</option>
                <option value="vehicles">Vehicles</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="new">Brand New</option>
                <option value="like_new">Like New</option>
                <option value="used_good">Used — Good</option>
                <option value="used_fair">Used — Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Starting Price (₹)
              </label>
              <input
                type="text"
                required
                value={startingPriceRupees}
                onChange={(e) => setStartingPriceRupees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Min Increment (₹)
              </label>
              <input
                type="text"
                required
                value={minIncrementRupees}
                onChange={(e) => setMinIncrementRupees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Save Changes</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
