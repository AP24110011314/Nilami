import React, { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client.js';

interface ReviewModalProps {
  auctionId: string;
  auctionTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  auctionId,
  auctionTitle,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.createReview(auctionId, rating, comment);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-nilami-border dark:border-nilami-dark-border relative space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-nilami-text/50 hover:text-nilami-text rounded-full hover:bg-nilami-sand/50 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="font-display font-bold text-lg text-nilami-text dark:text-nilami-dark-text">
            Review Seller
          </h3>
          <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60 mt-0.5 line-clamp-1">
            Lot: {auctionTitle}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark dark:text-nilami-danger-light rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60 block">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-500 hover:scale-110 transition cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-500 text-amber-500' : 'text-nilami-text/30'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-nilami-text/60 dark:text-nilami-dark-text/60 block">
              Feedback & Comments
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Packaging quality, shipping promptness, item condition accuracy..."
              className="w-full px-3.5 py-2 rounded-xl bg-nilami-sand/40 dark:bg-nilami-dark-bg border border-nilami-border dark:border-nilami-dark-border text-xs text-nilami-text dark:text-nilami-dark-text focus:outline-none focus:border-nilami-green-dark"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Review</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-nilami-sand dark:bg-nilami-dark-surface-elevated hover:bg-nilami-sand/80 text-xs font-semibold text-nilami-text dark:text-nilami-dark-text transition cursor-pointer border border-nilami-border"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
