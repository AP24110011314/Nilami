import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { apiClient, type AuctionItem } from '../../api/client.js';
import { AuctionCard } from '../../components/auctions/AuctionCard.js';
import { AuctionCardSkeleton } from '../../components/auctions/AuctionCardSkeleton.js';
import { paiseToRupees, rupeesToPaise } from '../../lib/money.js';
import {
  Search,
  SlidersHorizontal,
  X,
  PackageOpen,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'watches', label: 'Horology & Watches' },
  { id: 'art', label: 'Fine Art' },
  { id: 'collectibles', label: 'Rare Collectibles' },
  { id: 'fashion', label: 'Fashion & Luxury' },
  { id: 'vehicles', label: 'Vehicles & Accessories' },
  { id: 'furniture', label: 'Heritage Furniture' },
  { id: 'books', label: 'Books & First Editions' },
  { id: 'musical', label: 'Musical Instruments' },
  { id: 'appliances', label: 'Home Appliances' },
  { id: 'sports', label: 'Sports & Memorabilia' },
  { id: 'other', label: 'Other Items' },
];

const STATUS_OPTIONS = [
  { id: '', label: 'All Statuses' },
  { id: 'active', label: 'Live Now' },
  { id: 'scheduled', label: 'Upcoming' },
  { id: 'completed', label: 'Ended / Sold' },
];

const SORT_OPTIONS = [
  { id: 'endingSoon', label: 'Ending Soonest' },
  { id: 'newest', label: 'Newly Listed' },
  { id: 'priceAsc', label: 'Price: Low to High' },
  { id: 'priceDesc', label: 'Price: High to Low' },
  { id: 'mostBids', label: 'Most Bids' },
];

export const BrowsePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // URL search params
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'endingSoon';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Local form inputs
  const [searchInput, setSearchInput] = useState(q);
  const [minPriceRupees, setMinPriceRupees] = useState(
    minPriceParam ? String(paiseToRupees(parseInt(minPriceParam, 10))) : '',
  );
  const [maxPriceRupees, setMaxPriceRupees] = useState(
    maxPriceParam ? String(paiseToRupees(parseInt(maxPriceParam, 10))) : '',
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const fetchAuctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAuctions({
        q: q || undefined,
        category: category || undefined,
        status: status ? (status as import('../../api/client.js').AuctionItem['status']) : undefined,
        sort: sort || undefined,
        minPrice: minPriceParam ? parseInt(minPriceParam, 10) : undefined,
        maxPrice: maxPriceParam ? parseInt(maxPriceParam, 10) : undefined,
        page,
        limit: 12,
      });
      setAuctions(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAuctions();
  }, [q, category, status, sort, minPriceParam, maxPriceParam, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePriceApply = () => {
    const newParams = new URLSearchParams(searchParams);
    if (minPriceRupees.trim()) {
      try {
        newParams.set('minPrice', String(rupeesToPaise(minPriceRupees)));
      } catch {
        newParams.delete('minPrice');
      }
    } else {
      newParams.delete('minPrice');
    }

    if (maxPriceRupees.trim()) {
      try {
        newParams.set('maxPrice', String(rupeesToPaise(maxPriceRupees)));
      } catch {
        newParams.delete('maxPrice');
      }
    } else {
      newParams.delete('maxPrice');
    }

    newParams.set('page', '1');
    setSearchParams(newParams);
    setMobileFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setMinPriceRupees('');
    setMaxPriceRupees('');
    setSearchParams(new URLSearchParams());
    setMobileFilterOpen(false);
  };

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
    if (key === 'page') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeFilterCount =
    (q ? 1 : 0) +
    (category ? 1 : 0) +
    (status ? 1 : 0) +
    (minPriceParam ? 1 : 0) +
    (maxPriceParam ? 1 : 0);

  const totalPages = Math.ceil(total / 12) || 1;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-nilami-text tracking-tight">
            Browse Auctions
          </h1>
          <p className="text-xs sm:text-sm text-nilami-text/60">
            Discover {total} authenticated lots with real-time atomic bidding
          </p>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-nilami-text/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, brand, keyword..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-nilami-sand-surface border border-nilami-border text-sm text-nilami-text placeholder:text-nilami-text/40 focus:outline-none focus:border-nilami-green-dark focus:ring-1 focus:ring-nilami-green-dark"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateParam('q', '');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nilami-text/40 hover:text-nilami-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-nilami-green-dark hover:bg-nilami-green-pressed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Mobile Filter Toggle & Sort Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-nilami-border/60">
        <button
          type="button"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-nilami-sand-surface border border-nilami-border text-xs font-bold text-nilami-text shadow-sm cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-nilami-tan-dark" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-nilami-green-dark text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="hidden sm:flex items-center gap-1.5 text-xs text-nilami-danger-dark hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters ({activeFilterCount})</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown className="w-4 h-4 text-nilami-tan-dark hidden sm:block" />
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            aria-label="Sort auctions"
            className="text-xs font-bold bg-nilami-sand-surface border border-nilami-border rounded-xl px-3 py-2 text-nilami-text focus:outline-none focus:border-nilami-green-dark cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filter (Hidden on Mobile) */}
        <aside
          className={`lg:block ${
            mobileFilterOpen ? 'block' : 'hidden'
          } bg-nilami-sand-surface p-6 rounded-3xl border border-nilami-border space-y-6 shadow-sm`}
        >
          <div className="flex items-center justify-between border-b border-nilami-border/60 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-nilami-green-dark" />
              <h2 className="font-display font-bold text-sm text-nilami-green-dark">
                Filter Catalog
              </h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] text-nilami-danger-dark hover:underline font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nilami-text/50">
              Categories
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateParam('category', cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-nilami-green-dark text-white font-bold shadow-sm'
                        : 'text-nilami-text/80 hover:bg-nilami-sand/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3 pt-3 border-t border-nilami-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nilami-text/50">
              Auction Status
            </h3>
            <div className="space-y-1">
              {STATUS_OPTIONS.map((st) => {
                const isSelected = status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateParam('status', st.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-nilami-green-dark text-white font-bold shadow-sm'
                        : 'text-nilami-text/80 hover:bg-nilami-sand/50'
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3 pt-3 border-t border-nilami-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nilami-text/50">
              Price Range (₹)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="min-price-input" className="text-[10px] text-nilami-text/50 block mb-1">
                  Min ₹
                </label>
                <input
                  id="min-price-input"
                  type="number"
                  placeholder="0"
                  value={minPriceRupees}
                  onChange={(e) => setMinPriceRupees(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-nilami-ivory-surface border border-nilami-border text-xs text-nilami-text focus:outline-none focus:border-nilami-green-dark"
                />
              </div>
              <div>
                <label htmlFor="max-price-input" className="text-[10px] text-nilami-text/50 block mb-1">
                  Max ₹
                </label>
                <input
                  id="max-price-input"
                  type="number"
                  placeholder="500000"
                  value={maxPriceRupees}
                  onChange={(e) => setMaxPriceRupees(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-nilami-ivory-surface border border-nilami-border text-xs text-nilami-text focus:outline-none focus:border-nilami-green-dark"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handlePriceApply}
              className="w-full py-2 bg-nilami-tan hover:bg-nilami-sand text-nilami-text border border-nilami-border-strong rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Apply Price Filter
            </button>
          </div>
        </aside>

        {/* Catalog Grid (3 cols on desktop) */}
        <div className="lg:col-span-3 space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <AuctionCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 bg-nilami-danger-subtle border border-nilami-danger/30 rounded-3xl text-nilami-danger-dark text-center space-y-3">
              <p className="font-bold text-sm">Failed to retrieve listings</p>
              <p className="text-xs opacity-90">{error}</p>
              <button
                type="button"
                onClick={() => void fetchAuctions()}
                className="px-4 py-2 bg-nilami-danger-dark text-white rounded-xl text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : auctions.length === 0 ? (
            <div className="py-20 text-center bg-nilami-sand-surface rounded-3xl border border-nilami-border p-8 space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-nilami-sand text-nilami-tan-dark flex items-center justify-center mx-auto">
                <PackageOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="font-display font-bold text-lg text-nilami-text">
                  No auctions found
                </h3>
                <p className="text-xs text-nilami-text/60">
                  We couldn&apos;t find any lots matching your current filter criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-nilami-green-dark hover:bg-nilami-green-pressed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParam('page', String(page - 1))}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-nilami-sand-surface border border-nilami-border text-nilami-text hover:bg-nilami-sand disabled:opacity-40 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-medium text-nilami-text/60 px-3 font-mono">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => updateParam('page', String(page + 1))}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-nilami-sand-surface border border-nilami-border text-nilami-text hover:bg-nilami-sand disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
