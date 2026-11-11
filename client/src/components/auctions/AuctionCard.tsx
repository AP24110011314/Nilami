import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { getCategoryFallbackImage, resolveImageUrl } from '../../lib/media.js';
import { Clock, Gavel, ShieldCheck, Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useAuthStore } from '../../store/auth.js';
import { apiClient } from '../../api/client.js';

interface AuctionCardProps {
  auction: AuctionItem;
  isWatching?: boolean;
  onWatchToggle?: (auctionId: string, newState: boolean) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  isWatching: initialWatching = false,
  onWatchToggle,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const categoryDefault = getCategoryFallbackImage(auction.category);
  const initialImage = resolveImageUrl(auction.images?.[0]?.url) || categoryDefault;

  const [imgSrc, setImgSrc] = useState<string>(initialImage);
  const [imgError, setImgError] = useState<boolean>(false);
  const [watching, setWatching] = useState<boolean>(initialWatching);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    setImgSrc(initialImage);
    setImgError(false);
  }, [initialImage]);

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
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-sand text-nilami-text shadow-sm">
          Ended
        </span>
      );
    }

    if (auction.status === 'scheduled') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-tan/90 text-nilami-text border border-nilami-border-strong shadow-sm backdrop-blur-md">
          Upcoming
        </span>
      );
    }

    if (countdown.phase === 'red') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-nilami-danger-dark text-white border border-nilami-danger-border shadow-md animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>{countdown.formatted}</span>
        </span>
      );
    }

    if (countdown.phase === 'amber') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-warning-dark text-white shadow-md flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{countdown.formatted}</span>
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-nilami-green-dark text-white shadow-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-nilami-tan animate-pulse" />
        <span>{countdown.formatted}</span>
      </span>
    );
  };

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group bg-nilami-ivory-surface rounded-2xl border border-nilami-border overflow-hidden shadow-sm hover:shadow-xl hover:border-nilami-border-strong hover:-translate-y-1 transition-all duration-300 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-nilami-green-dark"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 bg-nilami-sand-surface overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-nilami-sand/60 to-nilami-ivory-surface text-nilami-text-muted p-4 select-none">
            <Gavel className="w-10 h-10 text-nilami-green-dark/50 mb-2" />
            <span className="text-xs font-bold text-nilami-text text-center line-clamp-1 max-w-[85%]">
              {auction.title}
            </span>
            <span className="text-[10px] font-bold text-nilami-tan-dark uppercase tracking-widest mt-1">
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
              ? 'bg-nilami-tan text-nilami-text border border-nilami-border-strong hover:bg-nilami-sand'
              : 'bg-nilami-text/70 text-nilami-ivory hover:bg-nilami-text hover:text-white'
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
          <h3 className="font-display font-bold text-base text-nilami-text group-hover:text-nilami-green-dark transition-colors line-clamp-2 leading-snug">
            {auction.title}
          </h3>
          <p className="text-xs text-nilami-text-muted line-clamp-2">
            {auction.description}
          </p>
        </div>

        {/* Price & Bid Stats */}
        <div className="pt-3 border-t border-nilami-border-subtle space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-nilami-text-muted">
                Current Bid
              </p>
              <p className="text-xl font-black text-nilami-text font-mono">
                {formatINR(auction.currentPrice)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-nilami-green-dark">
                <Gavel className="w-3.5 h-3.5" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </span>
              {auction.reserveMet && (
                <div className="flex items-center justify-end gap-1 text-[10px] text-nilami-green-dark font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Reserve met</span>
                </div>
              )}
            </div>
          </div>

          {/* Seller Rating & Ends Date */}
          <div className="flex items-center justify-between text-[11px] text-nilami-text-muted pt-1">
            {auction.seller?.ratingAvg && auction.seller.ratingAvg > 0 ? (
              <div className="flex items-center gap-1 text-nilami-tan-dark font-semibold">
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
