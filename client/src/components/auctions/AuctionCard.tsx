import React from 'react';
import { Link } from 'react-router';
import type { AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { Clock, Gavel, ShieldCheck } from 'lucide-react';

interface AuctionCardProps {
  auction: AuctionItem;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const primaryImage =
    auction.images[0]?.url ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

  const isEndingSoon =
    new Date(auction.endsAt).getTime() - Date.now() < 30 * 60 * 1000 &&
    auction.status === 'active';

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        <img
          src={primaryImage}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
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
        <div className="absolute bottom-3 right-3">
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

