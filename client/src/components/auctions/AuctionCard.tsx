import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { Clock, Gavel, ShieldCheck, Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useAuthStore } from '../../store/auth.js';
import { apiClient } from '../../api/client.js';

interface AuctionCardProps {
  auction: AuctionItem;
  isWatching?: boolean;
  onWatchToggle?: (auctionId: string, newState: boolean) => void;
}

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

const CATEGORY_FALLBACKS: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
  collectibles: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
  art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
  fashion: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
  vehicles: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
  watches: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
  furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
  books: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
  musical: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
  sports: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800',
  other: DEFAULT_FALLBACK_IMAGE,
};

export const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  isWatching: initialWatching = false,
  onWatchToggle,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const categoryDefault = CATEGORY_FALLBACKS[auction.category] ?? DEFAULT_FALLBACK_IMAGE;
  const initialImage = auction.images && auction.images[0]?.url ? auction.images[0].url : categoryDefault;

  const [imgSrc, setImgSrc] = useState<string>(initialImage);
  const [imgError, setImgError] = useState<boolean>(false);
  const [watching, setWatching] = useState<boolean>(initialWatching);
  const [watchLoading, setWatchLoading] = useState(false);

  // Authoritative synced countdown
  const countdown = useCountdown(auction.endsAt);

  const handleImageError = () => {
    if (imgSrc !== categoryDefault) {
      setImgSrc(categoryDefault);
    } else {
      setImgError(true);
    }
  };

  const handleWatchClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setWatchLoading(true);
    try {
      if (watching) {
        await apiClient.unwatchAuction(auction.id);
        setWatching(false);
        onWatchToggle?.(auction.id, false);
      } else {
        await apiClient.watchAuction(auction.id, 15);
        setWatching(true);
        onWatchToggle?.(auction.id, true);
      }
    } catch {
      // ignore
    } finally {
      setWatchLoading(false);
    }
  };

  const isHighestBidder = Boolean(user && auction.highestBidderId === user.id);

  // Render Countdown Chip with strict Nilami palette specs:
  // - amber under 60s
  // - red under 10s
  // - brand green for normal live
  const renderCountdownChip = () => {
    if (countdown.isEnded || auction.status === 'completed' || auction.status === 'unsold') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-sand dark:bg-nilami-dark-surface-elevated text-nilami-text/70 dark:text-nilami-dark-text/70 shadow-sm">
          Ended
        </span>
      );
    }

    if (auction.status === 'scheduled') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-tan/30 text-nilami-tan-dark dark:text-nilami-sand border border-nilami-tan/50 shadow-sm backdrop-blur-md">
          Upcoming
        </span>
      );
    }

    if (countdown.phase === 'red') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-nilami-danger-dark text-white border border-red-400 shadow-md animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>{countdown.formatted}</span>
        </span>
      );
    }

    if (countdown.phase === 'amber') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-md flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{countdown.formatted}</span>
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-green-dark text-white shadow-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
        <span>{countdown.formatted}</span>
      </span>
    );
  };

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-2xl border border-nilami-border dark:border-nilami-dark-border overflow-hidden shadow-sm hover:shadow-xl hover:border-nilami-tan dark:hover:border-nilami-sand/50 hover:-translate-y-1 transition-all duration-300 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-nilami-green"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 bg-nilami-sand/30 dark:bg-nilami-dark-surface-elevated overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-nilami-sand/40 to-nilami-ivory-surface text-nilami-text/40 p-4 select-none">
            <Gavel className="w-10 h-10 text-nilami-green-dark/40 mb-2" />
            <span className="text-xs font-bold text-nilami-text text-center line-clamp-1 max-w-[85%]">
              {auction.title}
            </span>
            <span className="text-[10px] font-bold text-nilami-tan uppercase tracking-widest mt-1">
              {auction.category}
            </span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={auction.title}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        )}

        {/* Top Badges: Countdown + Leading / Outbid */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 items-center">
          {renderCountdownChip()}

          {user && isHighestBidder && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-nilami-green-dark text-white shadow-sm">
              Leading
            </span>
          )}
        </div>

        {/* Top Right: Watch (Bookmark) Button */}
        <button
          type="button"
          onClick={handleWatchClick}
          disabled={watchLoading}
          aria-label={watching ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`absolute top-3 right-3 z-10 p-2 rounded-xl backdrop-blur-md transition-all shadow-sm cursor-pointer ${
            watching
              ? 'bg-nilami-tan text-white hover:bg-nilami-tan-dark'
              : 'bg-black/40 text-white/80 hover:bg-black/60 hover:text-white'
          }`}
          title={watching ? 'Watching (Click to remove)' : 'Add to Watchlist'}
        >
          {watching ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Bottom Right: Category Pill */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white">
            {auction.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text group-hover:text-nilami-green-dark dark:group-hover:text-nilami-sand transition-colors line-clamp-2 leading-snug">
            {auction.title}
          </h3>
          <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60 line-clamp-2">
            {auction.description}
          </p>
        </div>

        {/* Price & Bid Stats */}
        <div className="pt-3 border-t border-nilami-border/60 dark:border-nilami-dark-border/60 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-nilami-text/50 dark:text-nilami-dark-text/50">
                Current Bid
              </p>
              <p className="text-xl font-black text-nilami-text dark:text-nilami-dark-text font-mono">
                {formatINR(auction.currentPrice)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-nilami-green-dark dark:text-nilami-sand">
                <Gavel className="w-3.5 h-3.5" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </span>
              {auction.reserveMet && (
                <div className="flex items-center justify-end gap-1 text-[10px] text-nilami-green-dark dark:text-nilami-green font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Reserve met</span>
                </div>
              )}
            </div>
          </div>

          {/* Seller Rating & Ends Date */}
          <div className="flex items-center justify-between text-[11px] text-nilami-text/50 dark:text-nilami-dark-text/50 pt-1">
            {auction.seller?.ratingAvg && auction.seller.ratingAvg > 0 ? (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-current" />
                <span>{auction.seller.ratingAvg.toFixed(1)}</span>
                {auction.seller.ratingCount > 0 && <span>({auction.seller.ratingCount})</span>}
              </div>
            ) : (
              <span className="capitalize">{auction.condition.replace('_', ' ')}</span>
            )}
            <div className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>{new Date(auction.endsAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
