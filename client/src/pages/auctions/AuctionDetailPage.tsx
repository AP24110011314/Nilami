import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { apiClient, type AuctionItem, ApiError } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { useAuthStore } from '../../store/auth.js';
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
} from 'lucide-react';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAuction = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.getAuction(id);
        setAuction(res.auction);
        setServerTime(res.serverTime);
        if (res.auction.images[0]) {
          setSelectedImage(res.auction.images[0].url);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load auction lot');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchAuction();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading auction details...</p>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Auction Lot Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This lot does not exist or was removed.'}</p>
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
  const canEdit = isOwner && auction.bidCount === 0 && (auction.status === 'scheduled' || auction.status === 'active');

  return (
    <div className="space-y-8">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link to="/auctions" className="hover:text-indigo-600">
            Auctions
          </Link>
          <span>/</span>
          <span className="capitalize">{auction.category}</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate max-w-xs">{auction.title}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-4/3 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200">
            <img
              src={selectedImage || auction.images[0]?.url}
              alt={auction.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails */}
          {auction.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {auction.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                    selectedImage === img.url ? 'border-indigo-600 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

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
        </div>

        {/* Right: Bidding Panel & Seller (5 Cols) */}
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

            {/* Bid Action */}
            <div className="space-y-3">
              {user ? (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center space-y-2">
                  <p className="text-xs font-semibold text-indigo-900">
                    Live Real-Time Bidding opens in Phase 3
                  </p>
                  <p className="text-[11px] text-indigo-700">
                    Atomic MongoDB pipeline updates with anti-sniping extensions and instant socket push.
                  </p>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm text-center shadow-md transition"
                >
                  Sign In to Place a Bid
                </Link>
              )}
            </div>

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
