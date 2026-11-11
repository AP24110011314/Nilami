import React from 'react';

export const AuctionCardSkeleton: React.FC = () => {
  return (
    <div className="bg-nilami-sand-surface rounded-2xl border border-nilami-border overflow-hidden shadow-sm flex flex-col animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="aspect-4/3 bg-nilami-sand/60" />

      {/* Content skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-nilami-sand/80 rounded-md w-3/4" />
          <div className="h-3 bg-nilami-sand/55 rounded-md w-full" />
        </div>

        <div className="pt-3 border-t border-nilami-border/60 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="space-y-1">
              <div className="h-2.5 bg-nilami-sand/55 rounded w-16" />
              <div className="h-5 bg-nilami-sand/80 rounded w-24" />
            </div>
            <div className="h-4 bg-nilami-sand/55 rounded w-12" />
          </div>
          <div className="h-3 bg-nilami-sand/55 rounded w-28" />
        </div>
      </div>
    </div>
  );
};

