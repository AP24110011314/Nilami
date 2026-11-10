import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { rupeesToPaise } from '../../lib/money.js';
import { Upload, X, AlertCircle, ArrowRight, Loader2, Gavel } from 'lucide-react';

export const CreateAuctionPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<
    'electronics' | 'collectibles' | 'art' | 'fashion' | 'vehicles' | 'other'
  >('electronics');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used_good' | 'used_fair'>('new');
  const [startingPriceRupees, setStartingPriceRupees] = useState('');
  const [reservePriceRupees, setReservePriceRupees] = useState('');
  const [minIncrementRupees, setMinIncrementRupees] = useState('1000');

  // Defaults: starts in 2 minutes, ends in 2 hours
  const now = new Date();
  const defaultStartsAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString().slice(0, 16);
  const defaultEndsAt = new Date(now.getTime() + 120 * 60 * 1000).toISOString().slice(0, 16);

  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 6) {
      setError('You can upload a maximum of 6 images.');
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const updatedFiles = imageFiles.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(updatedFiles);
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (imageFiles.length === 0) {
      setError('At least one item image is required.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload images first
      setUploading(true);
      const uploadRes = await apiClient.uploadImages(imageFiles);
      setUploading(false);

      // 2. Prepare payload with integer paise
      const startingPrice = rupeesToPaise(startingPriceRupees);
      const minIncrement = rupeesToPaise(minIncrementRupees);
      const reservePrice = reservePriceRupees.trim() ? rupeesToPaise(reservePriceRupees) : null;

      const payload = {
        title,
        description,
        category,
        condition,
        images: uploadRes.images.map((img) => ({ url: img.url, publicId: img.publicId })),
        startingPrice,
        reservePrice,
        minIncrement,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      };

      const res = await apiClient.createAuction(payload);
      navigate(`/auctions/${res.auction.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create auction lot.');
      }
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-6 sm:p-10 border border-nilami-border dark:border-nilami-dark-border shadow-xl space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-nilami-green-dark dark:text-nilami-sand" />
          <h1 className="font-display font-black text-2xl sm:text-3xl text-nilami-text dark:text-nilami-dark-text tracking-tight">
            Create Auction Listing
          </h1>
        </div>
        <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
          List an authenticated lot for real-time competitive bidding with automatic anti-snipe protection
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark dark:text-nilami-danger-light flex items-center gap-2.5 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
            Item Title
          </label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vintage Rolex Submariner Date 41mm Ref. 126610LV"
            className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
          />
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-semibold"
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
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-semibold"
            >
              <option value="new">Brand New</option>
              <option value="like_new">Like New / Mint</option>
              <option value="used_good">Used — Good Condition</option>
              <option value="used_fair">Used — Fair</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
            Description & Provenance
          </label>
          <textarea
            required
            rows={4}
            minLength={10}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed condition notes, included box/papers, serial number, authenticity documentation..."
            className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark leading-relaxed"
          />
        </div>

        {/* Pricing (INR Rupees converted to integer paise) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated rounded-2xl border border-nilami-border/60 dark:border-nilami-dark-border">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Starting Price (₹)
            </label>
            <input
              type="text"
              required
              value={startingPriceRupees}
              onChange={(e) => setStartingPriceRupees(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3.5 py-2 rounded-xl bg-nilami-sand-surface dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm font-bold text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-mono"
            />
            <span className="text-[10px] text-nilami-text/40 block">Stored as integer paise</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Reserve Price (₹, optional)
            </label>
            <input
              type="text"
              value={reservePriceRupees}
              onChange={(e) => setReservePriceRupees(e.target.value)}
              placeholder="Hidden floor price"
              className="w-full px-3.5 py-2 rounded-xl bg-nilami-sand-surface dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm font-bold text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-mono"
            />
            <span className="text-[10px] text-nilami-text/40 block">Never leaked to buyers</span>
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
              placeholder="e.g. 1000"
              className="w-full px-3.5 py-2 rounded-xl bg-nilami-sand-surface dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm font-bold text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark font-mono"
            />
            <span className="text-[10px] text-nilami-text/40 block">Minimum bid step</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Starts At
            </label>
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60">
              Ends At
            </label>
            <input
              type="datetime-local"
              required
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-sm text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>
        </div>

        {/* Images Upload (1 to 6) */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60 block">
            Images (1 to 6 photos, max 5 MB each, sharp WebP auto-compressed)
          </label>

          <div className="flex flex-wrap gap-4 items-center">
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                className="relative w-24 h-24 rounded-2xl overflow-hidden border border-nilami-border shadow-sm"
              >
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-nilami-danger-dark transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {imageFiles.length < 6 && (
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-nilami-tan hover:border-nilami-green-dark flex flex-col items-center justify-center gap-1 text-nilami-text/50 hover:text-nilami-green-dark transition cursor-pointer bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated">
                <Upload className="w-5 h-5 text-nilami-tan" />
                <span className="text-[10px] font-bold uppercase">Upload</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full py-3.5 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting || uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{uploading ? 'Compressing and saving images...' : 'Transacting listing...'}</span>
            </div>
          ) : (
            <>
              <span>Publish Auction Listing</span>
              <ArrowRight className="w-4 h-4 text-nilami-sand" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
