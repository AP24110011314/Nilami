import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { getCategoryFallbackImage, resolveImageUrl } from '../../lib/media.js';
import { useAuthStore } from '../../store/auth.js';
import { useAuctionSocket } from '../../hooks/useAuctionSocket.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { BidForm } from '../../components/bids/BidForm.js';
import { BidHistory } from '../../components/bids/BidHistory.js';
import { WatchlistButton } from '../../components/watchlist/WatchlistButton.js';
import { AuctionPriceChart } from '../../components/analytics/AuctionPriceChart.js';
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Star,
  Loader2,
  Edit,
  Info,
  Users,
  Zap,
  Radio,
  Wifi,
  WifiOff,
  Trophy,
  AlertCircle,
  ZoomIn,
  X,
  ChevronRight,
} from 'lucide-react';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [detailImgError, setDetailImgError] = useState<boolean>(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImage('');
    setDetailImgError(false);
  }, [id]);

  // Realtime Socket.IO synchronization
  const { isConnected, viewerCount, extensionFlash } = useAuctionSocket(id);

  // TanStack Query for initial fetch & caching
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => apiClient.getAuction(id!),
    enabled: !!id,
    staleTime: Infinity, // Realtime socket keeps it updated
  });

  const auction = data?.auction;
  const serverTime = data?.serverTime;

  // Flash animation on socket price update
  useEffect(() => {
    if (auction?.currentPrice) {
      setPriceFlash(true);
      const timer = setTimeout(() => setPriceFlash(false), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [auction?.currentPrice]);

  // Authoritative countdown synced with DB clock offset
  const countdown = useCountdown(auction?.endsAt);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-nilami-green-dark animate-spin mx-auto" />
        <p className="text-sm font-semibold text-nilami-text/60">
          Connecting to live lot synchronization...
        </p>
      </div>
    );
  }

  if (queryError || !auction) {
    const errorMsg =
      queryError instanceof ApiError ? queryError.message : 'This lot does not exist or was removed.';
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-nilami-sand-surface rounded-3xl border border-nilami-border text-center space-y-4 shadow-sm">
        <h2 className="font-display font-bold text-xl text-nilami-text">
          Auction Lot Not Found
        </h2>
        <p className="text-xs text-nilami-text/60">{errorMsg}</p>
        <Link
          to="/auctions"
          className="inline-block px-5 py-2.5 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === auction.sellerId;
  const canEdit =
    isOwner && auction.bidCount === 0 && (auction.status === 'scheduled' || auction.status === 'active');

  const activeImage =
    resolveImageUrl(selectedImage || auction.images[0]?.url) ||
    getCategoryFallbackImage(auction.category);

  const getUrgencyBadge = () => {
    if (countdown.isEnded || auction.status === 'completed' || auction.status === 'unsold') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nilami-sand text-nilami-text/70 border border-nilami-border/80">
          Closed
        </span>
      );
    }
    if (countdown.phase === 'red') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-nilami-danger-dark text-white shadow-md animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Final Seconds: {countdown.formatted}
        </span>
      );
    }
    if (countdown.phase === 'amber') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nilami-tan text-nilami-text border border-nilami-border-strong shadow-md flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-nilami-warning-dark" />
          Ending Soon: {countdown.formatted}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nilami-green-dark text-white shadow-sm flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-nilami-sand" />
        {countdown.formatted} left
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-16">
      {/* Anti-snipe Extension Banner */}
      {extensionFlash && (
        <div
          role="status"
          className="bg-nilami-tan text-nilami-text font-bold px-5 py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 animate-bounce border-2 border-nilami-border-strong"
        >
          <Zap className="w-5 h-5 fill-current text-nilami-warning-dark" />
          <span>Anti-Snipe Protection Triggered! Bidding extended by +30 seconds.</span>
        </div>
      )}

      {/* Breadcrumb & Live Stream Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xs text-nilami-text/60">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <Link to="/auctions" className="hover:text-nilami-green-dark transition shrink-0">
            Auctions
          </Link>
          <ChevronRight className="w-3 h-3 text-nilami-tan-dark shrink-0" />
          <span className="capitalize shrink-0">{auction.category}</span>
          <ChevronRight className="w-3 h-3 text-nilami-tan-dark shrink-0" />
          <span className="font-bold text-nilami-text truncate">
            {auction.title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Socket status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-[11px] border shadow-sm ${
              isConnected
                ? 'bg-nilami-green-subtle/70 text-nilami-green-dark border-nilami-green/40'
                : 'bg-nilami-danger-subtle text-nilami-danger-dark border-nilami-danger/30'
            }`}
          >
            {isConnected ? (
              <>
                <Radio className="w-3.5 h-3.5 text-nilami-green animate-pulse" />
                <span>Live Socket</span>
                <Wifi className="w-3 h-3 text-nilami-green" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-nilami-danger-dark" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>

          {/* Active Viewers Count */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-nilami-sand/50 text-nilami-text text-[11px] font-semibold border border-nilami-border">
            <Users className="w-3.5 h-3.5 text-nilami-tan-dark" />
            <span>{viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span>
          </div>

          <WatchlistButton auctionId={auction.id} />

          {canEdit && (
            <Link
              to={`/seller/auctions/${auction.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nilami-sand hover:bg-nilami-sand/80 text-nilami-text font-bold text-xs transition border border-nilami-border"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Lot</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Gallery, Specs & Analytics (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            {/* Main Image with Zoom Trigger */}
            <div className="group relative aspect-4/3 bg-nilami-sand/30 rounded-3xl overflow-hidden border border-nilami-border shadow-sm">
              {detailImgError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-nilami-sand/40 to-nilami-ivory-surface text-nilami-text/40 p-8 select-none">
                  <Gavel className="w-16 h-16 text-nilami-green-dark/40 mb-3" />
                  <span className="text-base font-bold text-nilami-text text-center line-clamp-2 max-w-md">
                    {auction.title}
                  </span>
                  <span className="text-xs font-bold text-nilami-tan-dark uppercase tracking-widest mt-2">
                    {auction.category} Lot
                  </span>
                </div>
              ) : (
                <img
                  src={activeImage}
                  alt={auction.title}
                  onError={() => {
                    const fallback = getCategoryFallbackImage(auction.category);
                    if (activeImage !== fallback) {
                      setSelectedImage(fallback);
                    } else {
                      setDetailImgError(true);
                    }
                  }}
                  className="w-full h-full object-cover transition-transform duration-300"
                />
              )}

              <div className="absolute top-4 left-4 z-10">{getUrgencyBadge()}</div>

              {/* Click to Zoom Pill */}
              <button
                type="button"
                onClick={() => setZoomModalOpen(true)}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Zoom</span>
              </button>
            </div>

            {/* Thumbnail Strip */}
            {auction.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {auction.images.map((img, i) => {
                  const resolvedThumb = resolveImageUrl(img.url);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(resolvedThumb)}
                      className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                        activeImage === resolvedThumb
                          ? 'border-nilami-green-dark shadow-md scale-105'
                          : 'border-nilami-border opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={resolvedThumb}
                        alt={`Thumbnail ${i + 1}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCategoryFallbackImage(
                            auction.category,
                          );
                        }}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description & Specs */}
          <div className="bg-nilami-sand-surface rounded-3xl p-6 sm:p-8 border border-nilami-border shadow-sm space-y-4">
            <h2 className="font-display font-bold text-lg text-nilami-text">
              Lot Description
            </h2>
            <div className="text-sm text-nilami-text/80 leading-relaxed whitespace-pre-line">
              {auction.description}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-nilami-border/60 text-xs">
              <div>
                <span className="text-nilami-text/50 block font-medium">
                  Condition
                </span>
                <span className="font-bold text-nilami-text capitalize">
                  {auction.condition.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-nilami-text/50 block font-medium">
                  Category
                </span>
                <span className="font-bold text-nilami-text capitalize">
                  {auction.category}
                </span>
              </div>
              <div>
                <span className="text-nilami-text/50 block font-medium">
                  Financial Precision
                </span>
                <span className="font-bold text-nilami-text">
                  INR (Integer Paise)
                </span>
              </div>
            </div>
          </div>

          {/* Price Progression Chart */}
          <AuctionPriceChart auctionId={auction.id} />

          {/* Real-time Bid History */}
          <BidHistory auctionId={auction.id} />
        </div>

        {/* Right Column: Sticky Bid Panel & Seller Info (5 Cols) */}
        <div id="bid-panel" className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 scroll-mt-24">
          <div className="bg-nilami-sand-surface rounded-3xl p-6 sm:p-8 border border-nilami-border shadow-lg space-y-6">
            {/* Status & Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nilami-green-subtle/80 text-nilami-green-dark border border-nilami-green/30">
                  {auction.status}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-nilami-text/50 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ends: {new Date(auction.endsAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <h1 className="font-display font-black text-2xl text-nilami-text leading-snug">
                {auction.title}
              </h1>
            </div>

            {/* Price Panel with Live Tick Flash */}
            <div
              className={`p-5 rounded-2xl bg-nilami-ivory/80 border border-nilami-border space-y-3 transition-colors duration-300 ${
                priceFlash ? 'bg-nilami-green-subtle/70 ring-2 ring-nilami-green' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-nilami-text/50 block">
                    Current High Bid
                  </span>
                  <span
                    className="text-3xl font-black text-nilami-text font-mono tracking-tight"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {formatINR(auction.currentPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-nilami-text/50 block">
                    Next Minimum
                  </span>
                  <span className="text-sm font-bold text-nilami-green-dark font-mono">
                    {formatINR(auction.minNextBid)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-nilami-border/60 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-nilami-text">
                  <Gavel className="w-4 h-4 text-nilami-tan-dark" />
                  {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} placed
                </span>

                {auction.reserveMet ? (
                  <span className="flex items-center gap-1 text-nilami-green-dark font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Reserve met
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-nilami-warning-dark font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    Reserve pending
                  </span>
                )}
              </div>
            </div>

            {/* Bidding Actions / Win Banner / Closed State */}
            {user &&
            (auction.status === 'payment_pending' || auction.status === 'completed') &&
            auction.winnerId === user.id ? (
              <div className="p-6 rounded-2xl bg-nilami-green-subtle/90 border-2 border-nilami-green/50 text-nilami-green-dark space-y-3 shadow-md">
                <div className="flex items-center gap-2 font-display font-black text-base">
                  <Trophy className="w-5 h-5 text-nilami-green" />
                  <span>You Won This Auction!</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  Congratulations! Your winning bid of{' '}
                  <strong className="font-bold">
                    {formatINR(auction.finalPrice || auction.currentPrice)}
                  </strong>{' '}
                  secured this lot. Complete verified escrow checkout to initiate delivery.
                </p>
                {checkoutError && (
                  <div className="p-3 rounded-xl bg-nilami-danger-subtle border border-nilami-danger-border text-nilami-danger-dark text-xs font-semibold">
                    {checkoutError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setCheckoutError(null);
                    try {
                      const res = await apiClient.createCheckoutSession(auction.id);
                      if (res.checkoutUrl) {
                        window.location.href = res.checkoutUrl;
                      }
                    } catch {
                      setCheckoutError('Failed to initiate checkout. Please try again.');
                    }
                  }}
                  className="block w-full py-3.5 px-4 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs text-center shadow-md transition cursor-pointer"
                >
                  Proceed to Pay Now ({formatINR(auction.finalPrice || auction.currentPrice)})
                </button>
              </div>
            ) : auction.status === 'unsold' ? (
              <div className="p-6 rounded-2xl bg-nilami-sand/40 border border-nilami-border text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-nilami-text/40 mx-auto" />
                <h3 className="font-bold text-sm text-nilami-text">
                  Auction Ended Unsold
                </h3>
                <p className="text-xs text-nilami-text/60">
                  This lot ended without meeting the reserve price or receiving qualifying bids.
                </p>
              </div>
            ) : auction.status === 'payment_pending' ||
              auction.status === 'completed' ||
              auction.status === 'payment_failed' ? (
              <div className="p-6 rounded-2xl bg-nilami-sand/40 border border-nilami-border text-center space-y-2">
                <h3 className="font-bold text-sm text-nilami-text">
                  Auction Closed
                </h3>
                <p className="text-xs text-nilami-text/60">
                  Winning Bid:{' '}
                  <strong className="font-bold text-nilami-text">
                    {formatINR(auction.finalPrice || auction.currentPrice)}
                  </strong>
                </p>
              </div>
            ) : user ? (
              <BidForm auction={auction} />
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full py-3.5 px-4 rounded-2xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-sm text-center shadow-md transition"
                >
                  Sign In to Place a Bid
                </Link>
                <p className="text-center text-xs text-nilami-text/50">
                  New to Nilami?{' '}
                  <Link to="/register" className="text-nilami-green-dark font-bold hover:underline">
                    Create free account
                  </Link>
                </p>
              </div>
            )}

            {serverTime && (
              <div className="flex items-center justify-between text-[11px] font-mono text-nilami-text/50 pt-2 border-t border-nilami-border/60">
                <span>Cluster Server Clock:</span>
                <span>{new Date(serverTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Seller Card */}
          {auction.seller && (
            <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nilami-text/50">
                Seller Information
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center font-bold text-sm">
                    {auction.seller.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-nilami-text">
                      {auction.seller.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-nilami-warning-dark">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold">
                        {auction.seller.ratingAvg > 0 ? auction.seller.ratingAvg.toFixed(1) : 'New Seller'}
                      </span>
                      {auction.seller.ratingCount > 0 && (
                        <span className="text-nilami-text/50">({auction.seller.ratingCount})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nilami-sand/50 border border-nilami-border text-nilami-text/80 text-[11px] font-semibold">
                  <Info className="w-3.5 h-3.5 text-nilami-tan-dark" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Lightbox Modal */}
      {zoomModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
              aria-label="Close image zoom"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImage}
              alt={auction.title}
              className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Bid Bar */}
      {auction.status === 'active' && !countdown.isEnded && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-nilami-ivory/95 backdrop-blur-md border-t border-nilami-border-strong px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-nilami-text-muted">
                Current Bid • {countdown.formatted}
              </span>
              <span className="font-mono font-black text-base text-nilami-text truncate block">
                {formatINR(auction.currentPrice)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                document.getElementById('bid-panel')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Gavel className="w-3.5 h-3.5 text-nilami-sand" />
              <span>Bid {formatINR(auction.minNextBid)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
