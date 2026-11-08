import React, { useState } from 'react';
import { Link } from 'react-router';
import type { AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { Clock, Gavel, ShieldCheck } from 'lucide-react';

interface AuctionCardProps {
  auction: AuctionItem;
}

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

const CATEGORY_FALLBACKS: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
  collectibles: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
  art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
  fashion: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
  vehicles: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
  other: DEFAULT_FALLBACK_IMAGE,
};

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const categoryDefault = CATEGORY_FALLBACKS[auction.category] ?? DEFAULT_FALLBACK_IMAGE;
  const initialImage = auction.images && auction.images[0]?.url ? auction.images[0].url : categoryDefault;

  const [imgSrc, setImgSrc] = useState<string>(initialImage);
  const [imgError, setImgError] = useState<boolean>(false);

  const handleImageError = () => {
    if (imgSrc !== categoryDefault) {
      setImgSrc(categoryDefault);
    } else {
      setImgError(true);
    }
  };

  const endsInMs = new Date(auction.endsAt).getTime() - Date.now();
  const isEndingSoon = endsInMs > 0 && endsInMs < 30 * 60 * 1000 && auction.status === 'active';

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200 text-slate-400 p-4 select-none">
            <Gavel className="w-10 h-10 text-indigo-400 mb-2 opacity-50" />
            <span className="text-xs font-bold text-slate-700 text-center line-clamp-1 max-w-[85%]">
              {auction.title}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600/70 uppercase tracking-widest mt-1">
              {auction.category} Lot
            </span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={auction.title}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          {auction.status === 'active' ? (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                isEndingSoon ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'
              }`}
            >
              {isEndingSoon ? 'Ending Soon' : 'Live'}
            </span>
          ) : auction.status === 'scheduled' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
              Upcoming
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700 text-white shadow-sm">
              {auction.status}
            </span>
          )}
        </div>

        {/* Category Pill */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white capitalize">
            {auction.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
            {auction.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2">{auction.description}</p>
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Current Bid
              </p>
              <p className="text-xl font-extrabold text-slate-900">
                {formatINR(auction.currentPrice)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Gavel className="w-3.5 h-3.5 text-indigo-500" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </span>
              {auction.reserveMet && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  Reserve met
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Ends: {new Date(auction.endsAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
