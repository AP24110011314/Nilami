import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiClient, type HealthResponse, type AuctionItem } from '../api/client.js';
import { AuctionCard } from '../components/auctions/AuctionCard.js';
import { AuctionCardSkeleton } from '../components/auctions/AuctionCardSkeleton.js';
import {
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Watch,
  Laptop,
  Palette,
  Car,
  Shirt,
  Armchair,
  BookOpen,
  Music,
  CheckCircle2,
  XCircle,
  Database,
  Server,
  RefreshCw,
  Coins,
} from 'lucide-react';

const CATEGORY_TILES = [
  { id: 'electronics', label: 'Electronics', count: '18+ lots', icon: Laptop },
  { id: 'watches', label: 'Horology & Watches', count: '14+ lots', icon: Watch },
  { id: 'art', label: 'Fine Art & Miniatures', count: '12+ lots', icon: Palette },
  { id: 'collectibles', label: 'Rare Collectibles', count: '20+ lots', icon: Coins },
  { id: 'fashion', label: 'Luxury Fashion', count: '10+ lots', icon: Shirt },
  { id: 'vehicles', label: 'Vehicles & Accessories', count: '8+ lots', icon: Car },
  { id: 'furniture', label: 'Heritage Furniture', count: '9+ lots', icon: Armchair },
  { id: 'books', label: 'First Editions & Books', count: '7+ lots', icon: BookOpen },
  { id: 'musical', label: 'Musical Instruments', count: '6+ lots', icon: Music },
];

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [endingSoonAuctions, setEndingSoonAuctions] = useState<AuctionItem[]>([]);
  const [trendingAuctions, setTrendingAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthData, endingSoonData, trendingData] = await Promise.all([
        apiClient.getHealth().catch(() => null),
        apiClient.getAuctions({ status: 'active', limit: 4, sort: 'endingSoon' }),
        apiClient.getAuctions({ status: 'active', limit: 4, sort: 'mostBids' }),
      ]);
      setHealth(healthData);
      setEndingSoonAuctions(endingSoonData.items);
      setTrendingAuctions(trendingData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-nilami-green-dark via-[#345140] to-nilami-text text-white p-8 sm:p-14 lg:p-16 shadow-2xl overflow-hidden border border-nilami-green-dark/40">
        {/* Decorative background glow & pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-nilami-tan/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-nilami-green/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nilami-sand/15 border border-nilami-sand/30 text-nilami-sand text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-nilami-tan" />
            <span>Authoritative Live Auction Platform</span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] text-white">
            Authenticated Lots.<br />
            <span className="text-nilami-sand">Authoritative Bids.</span>
          </h1>

          <p className="text-nilami-sand/90 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl">
            Experience real-time live bidding with MongoDB atomic updates, sub-200ms socket updates,
            authoritative server timestamps, integer paise financial accuracy, and automatic 30-second anti-snipe extensions.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/auctions"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-nilami-sand text-nilami-text hover:bg-white font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <span>Explore Live Lots</span>
              <ArrowRight className="w-4 h-4 text-nilami-green-dark" />
            </Link>
            <Link
              to="/seller/new"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all backdrop-blur-md"
            >
              <span>Consign an Item</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live "Ending Soon" Strip (Ticker / Featured Bar) */}
      <section className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-6 sm:p-8 border border-nilami-border dark:border-nilami-dark-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-nilami-border/60 dark:border-nilami-dark-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-nilami-danger-subtle text-nilami-danger-dark dark:text-nilami-danger-light">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-nilami-text dark:text-nilami-dark-text leading-tight">
                Ending Soon
              </h2>
              <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
                Auctions in their final minutes of active bidding
              </p>
            </div>
          </div>
          <Link
            to="/auctions?sort=endingSoon"
            className="flex items-center gap-1.5 text-xs font-bold text-nilami-green-dark dark:text-nilami-sand hover:underline self-end sm:self-auto"
          >
            <span>View All ({endingSoonAuctions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Ending Soon Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <AuctionCardSkeleton key={i} />)
          ) : endingSoonAuctions.length > 0 ? (
            endingSoonAuctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50 bg-nilami-sand/20 dark:bg-nilami-dark-surface-elevated rounded-2xl border border-nilami-border/50">
              No live auctions ending in the next few minutes. Browse upcoming lots below.
            </div>
          )}
        </div>
      </section>

      {/* Category Tiles */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl text-nilami-text dark:text-nilami-dark-text tracking-tight">
              Featured Categories
            </h2>
            <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
              Curated collections inspected by certified appraisers
            </p>
          </div>
          <Link
            to="/auctions"
            className="text-xs font-bold text-nilami-green-dark dark:text-nilami-sand hover:underline flex items-center gap-1"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORY_TILES.slice(0, 10).map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/auctions?category=${cat.id}`}
                className="group p-5 rounded-2xl bg-nilami-sand-surface dark:bg-nilami-dark-surface border border-nilami-border dark:border-nilami-dark-border hover:border-nilami-tan dark:hover:border-nilami-sand/50 hover:bg-nilami-sand/40 dark:hover:bg-nilami-dark-surface-elevated hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-nilami-green-subtle/80 dark:bg-nilami-green-dark/30 text-nilami-green-dark dark:text-nilami-sand flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-nilami-text dark:text-nilami-dark-text group-hover:text-nilami-green-dark dark:group-hover:text-nilami-sand transition-colors">
                    {cat.label}
                  </h3>
                  <span className="text-[11px] font-semibold text-nilami-tan dark:text-nilami-sand/70">
                    {cat.count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Auctions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-nilami-green-subtle text-nilami-green-dark dark:text-nilami-sand">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-nilami-text dark:text-nilami-dark-text tracking-tight">
                Trending Lots
              </h2>
              <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
                Most active bidding wars across the platform
              </p>
            </div>
          </div>
          <Link
            to="/auctions?sort=mostBids"
            className="text-xs font-bold text-nilami-green-dark dark:text-nilami-sand hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <AuctionCardSkeleton key={i} />)
          ) : trendingAuctions.length > 0 ? (
            trendingAuctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50 bg-nilami-sand/20 dark:bg-nilami-dark-surface-elevated rounded-2xl border border-nilami-border/50">
              No active bids yet. Place a bid to kick off the trending list!
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl p-8 sm:p-12 border border-nilami-border dark:border-nilami-dark-border shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-[11px] uppercase tracking-widest font-bold text-nilami-tan dark:text-nilami-sand/70">
            Fair & Transparent
          </span>
          <h2 className="font-display font-black text-3xl text-nilami-green-dark dark:text-nilami-sand tracking-tight">
            How Nilami Works
          </h2>
          <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
            Engineered from first principles to eradicate race conditions, phantom outbids, and last-second bot snipes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/80 dark:border-nilami-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text">
              Verified Lots
            </h3>
            <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
              Every item is inspected with verified condition ratings, high-resolution photography, and guaranteed reserves.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/80 dark:border-nilami-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text">
              Atomic Bidding
            </h3>
            <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
              MongoDB transactions and authoritative cluster clocks ($$NOW) validate bids server-side. Zero browser clock dependency.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/80 dark:border-nilami-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text">
              Anti-Snipe Defense
            </h3>
            <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
              Any bid placed within the final 10 seconds automatically extends the auction by 30 seconds, giving genuine bidders fair rebuttal.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/80 dark:border-nilami-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text">
              Stripe Escrow
            </h3>
            <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 leading-relaxed">
              Winning bids are settled via encrypted Stripe 3DS checkouts. Funds are securely released upon courier confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* Seller Call-To-Action Banner */}
      <section className="rounded-3xl bg-nilami-sand dark:bg-nilami-dark-surface-elevated border border-nilami-tan/40 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <span className="text-[10px] uppercase font-bold tracking-widest text-nilami-green-dark dark:text-nilami-sand">
            Become a Seller
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-nilami-green-dark dark:text-nilami-sand">
            Consign your rare collection to qualified bidders worldwide.
          </h2>
          <p className="text-xs text-nilami-text/80 dark:text-nilami-dark-text/80 leading-relaxed">
            No upfront listing fees. Comprehensive analytics, automated anti-sniping protection, and guaranteed escrow settlements.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            to="/seller/new"
            className="px-6 py-3.5 rounded-2xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs text-center transition shadow-md"
          >
            Create Auction Listing
          </Link>
          <Link
            to="/register"
            className="px-6 py-3.5 rounded-2xl bg-nilami-ivory dark:bg-nilami-dark-surface hover:bg-white text-nilami-text dark:text-nilami-dark-text font-bold text-xs text-center border border-nilami-border dark:border-nilami-dark-border transition"
          >
            Open Seller Account
          </Link>
        </div>
      </section>

      {/* System Health Telemetry Section */}
      <section className="bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-3xl border border-nilami-border dark:border-nilami-dark-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-nilami-text dark:text-nilami-dark-text">
              Platform Telemetry & Live Nodes
            </h2>
            <p className="text-xs text-nilami-text/60 dark:text-nilami-dark-text/60">
              Real-time health of native infrastructure nodes
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-nilami-sand dark:bg-nilami-dark-surface-elevated hover:bg-nilami-sand-surface text-nilami-text dark:text-nilami-dark-text transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark dark:text-nilami-danger-light flex items-center gap-3">
            <XCircle className="w-5 h-5 text-nilami-danger-dark flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to connect to Nilami API</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/60 dark:border-nilami-dark-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-nilami-text/70 dark:text-nilami-dark-text/70">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-nilami-green-dark dark:text-nilami-green" />
                  MongoDB (rs0)
                </span>
                <span className="font-mono text-[11px] text-nilami-text/40">port 27018</span>
              </div>
              <div className="flex items-center gap-2">
                {health?.mongo === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-nilami-green-dark dark:text-nilami-green" />
                    <span className="text-sm font-bold text-nilami-text dark:text-nilami-dark-text">Online</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-nilami-text dark:text-nilami-dark-text">Checking...</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/60 dark:border-nilami-dark-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-nilami-text/70 dark:text-nilami-dark-text/70">
                <span className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-nilami-green-dark dark:text-nilami-green" />
                  Redis Queue
                </span>
                <span className="font-mono text-[11px] text-nilami-text/40">port 6380</span>
              </div>
              <div className="flex items-center gap-2">
                {health?.redis === 'ok' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-nilami-green-dark dark:text-nilami-green" />
                    <span className="text-sm font-bold text-nilami-text dark:text-nilami-dark-text">Online</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-nilami-text dark:text-nilami-dark-text">Checking...</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/60 dark:border-nilami-dark-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-nilami-text/70 dark:text-nilami-dark-text/70">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-nilami-green-dark dark:text-nilami-sand" />
                  Authoritative Clock
                </span>
                <span className="font-mono text-[11px] text-nilami-text/40">$$NOW</span>
              </div>
              <p className="text-xs font-mono text-nilami-text dark:text-nilami-dark-text truncate">
                {health?.serverTime || (loading ? 'Synchronizing...' : 'Unavailable')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-nilami-ivory/80 dark:bg-nilami-dark-bg border border-nilami-border/60 dark:border-nilami-dark-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-nilami-text/70 dark:text-nilami-dark-text/70">
                <span>Process Uptime</span>
                <span className="font-mono text-[11px] text-nilami-text/40">API Node</span>
              </div>
              <p className="text-sm font-bold text-nilami-text dark:text-nilami-dark-text font-mono">
                {health ? `${Math.floor(health.uptime)}s` : loading ? '...' : '0s'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
