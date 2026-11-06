import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { useAuthStore } from '../../store/auth.js';
import { useAuctionSocket } from '../../hooks/useAuctionSocket.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { BidForm } from '../../components/bids/BidForm.js';
import { BidHistory } from '../../components/bids/BidHistory.js';
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
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
} from 'lucide-react';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState<string>('');

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

  // Authoritative countdown synced with DB clock offset
  const countdown = useCountdown(auction?.endsAt);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Connecting to live auction lot...</p>
      </div>
    );
  }

  if (queryError || !auction) {
    const errorMsg =
      queryError instanceof ApiError ? queryError.message : 'This lot does not exist or was removed.';
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Auction Lot Not Found</h2>
        <p className="text-xs text-slate-500">{errorMsg}</p>
        <Link
          to="/auctions"
          className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === auction.sellerId;
  const canEdit =
    isOwner && auction.bidCount === 0 && (auction.status === 'scheduled' || auction.status === 'active');

  const getUrgencyBadge = () => {
    if (countdown.isEnded || auction.status === 'completed' || auction.status === 'unsold') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          Closed
        </span>
      );
    }
    if (countdown.phase === 'red') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
          Final Seconds: {countdown.formatted}
        </span>
      );
    }
    if (countdown.phase === 'amber') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Ending Soon: {countdown.formatted}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-emerald-600" />
        {countdown.formatted} left
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Anti-snipe Extension Flash Notification */}
      {extensionFlash && (
        <div
          role="status"
          className="bg-amber-500 text-stone-950 font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce"
        >
          <Zap className="w-5 h-5 fill-current" />
          <span>Anti-Snipe Triggered! Bidding extended by +30 seconds.</span>
        </div>
      )}

      {/* Top Bar with Live Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link to="/auctions" className="hover:text-indigo-600">
            Auctions
          </Link>
          <span>/</span>
          <span className="capitalize">{auction.category}</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate max-w-xs">{auction.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Realtime Live Connection Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-[11px] border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isConnected ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Live Socket</span>
                <Wifi className="w-3 h-3 text-emerald-600" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>

          {/* Active Viewers Count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span>
          </div>

          {canEdit && (
            <Link
              to={`/seller/auctions/${auction.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Lot</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery & Specs (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <div className="aspect-4/3 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative">
              <img
                src={selectedImage || auction.images[0]?.url}
                alt={auction.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">{getUrgencyBadge()}</div>
            </div>

            {/* Thumbnails */}
            {auction.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {auction.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                      selectedImage === img.url
                        ? 'border-indigo-600 shadow-md'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Lot Description</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {auction.description}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Condition</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {auction.condition.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Category</span>
                <span className="font-semibold text-slate-800 capitalize">{auction.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Currency</span>
                <span className="font-semibold text-slate-800">INR (Paise Accounting)</span>
              </div>
            </div>
          </div>

          {/* Bid History Component */}
          <BidHistory auctionId={auction.id} />
        </div>

        {/* Right: Bidding Form & Seller Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            {/* Status & Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {auction.status}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ends: {new Date(auction.endsAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-snug">{auction.title}</h1>
            </div>

            {/* Price Panel */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400 block">
                    Current Price
                  </span>
                  <span className="text-3xl font-black text-slate-900" aria-live="polite">
                    {formatINR(auction.currentPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-400 block">
                    Next Minimum
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {formatINR(auction.minNextBid)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Gavel className="w-4 h-4 text-indigo-500" />
                  {auction.bidCount} bids placed
                </span>

                {auction.reserveMet ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    Reserve price met
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    Reserve pending
                  </span>
                )}
              </div>
            </div>

            {/* Ended / Winner / Unsold / Bidding State */}
            {user && (auction.status === 'payment_pending' || auction.status === 'completed') && auction.winnerId === user.id ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-950 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-base">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <span>You Won This Auction!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Congratulations! Your winning bid was{' '}
                  <strong className="font-bold">{formatINR(auction.finalPrice || auction.currentPrice)}</strong>. Complete
                  payment to initiate shipping and claim your item.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiClient.createCheckoutSession(auction.id);
                      if (res.checkoutUrl) {
                        window.location.href = res.checkoutUrl;
                      }
                    } catch {
                      alert('Failed to initiate checkout session. Please try again.');
                    }
                  }}
                  className="block w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center shadow transition cursor-pointer"
                >
                  Proceed to Pay Now ({formatINR(auction.finalPrice || auction.currentPrice)})
                </button>
              </div>
            ) : auction.status === 'unsold' ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">Auction Ended Unsold</h3>
                <p className="text-xs text-slate-500">
                  This lot ended without meeting the reserve price or receiving qualifying bids.
                </p>
              </div>
            ) : auction.status === 'payment_pending' || auction.status === 'completed' || auction.status === 'payment_failed' ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <h3 className="font-bold text-sm text-slate-800">Auction Closed</h3>
                <p className="text-xs text-slate-500">
                  Winning Bid:{' '}
                  <strong className="font-bold text-slate-900">
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
                  className="block w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm text-center shadow-md transition"
                >
                  Sign In to Place a Bid
                </Link>
                <p className="text-center text-xs text-slate-400">
                  New to Nilami?{' '}
                  <Link to="/register" className="text-indigo-600 font-semibold">
                    Create free account
                  </Link>
                </p>
              </div>
            )}

            {serverTime && (
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>Server Authoritative Time:</span>
                <span>{new Date(serverTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Seller Card */}
          {auction.seller && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller Information</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{auction.seller.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-semibold text-slate-700">
                        {auction.seller.ratingAvg > 0 ? auction.seller.ratingAvg.toFixed(1) : 'New Seller'}
                      </span>
                      {auction.seller.ratingCount > 0 && (
                        <span className="text-slate-400">({auction.seller.ratingCount})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium">
                  <Info className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
