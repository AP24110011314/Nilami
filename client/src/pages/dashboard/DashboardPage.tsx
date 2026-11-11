import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '../../store/auth.js';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import { getCategoryFallbackImage, resolveImageUrl } from '../../lib/media.js';
import {
  CheckCircle2,
  AlertTriangle,
  Store,
  Gavel,
  Award,
  TrendingUp,
  ArrowUpRight,
  Bookmark,
  BarChart3,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReviewModal } from '../../components/reviews/ReviewModal.js';

interface MyBidItem {
  auction: AuctionItem;
  myHighestBid: number;
  leading: boolean;
}

interface MyWinItem {
  auction: AuctionItem;
  finalPrice: number;
}

interface MyWatchItem {
  id: string;
  auction: AuctionItem;
  reminderMinutesBefore?: number | null;
  createdAt: string;
}

export const DashboardPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'bids' | 'wins' | 'watchlist' | 'analytics'>('overview');

  const [myBids, setMyBids] = useState<MyBidItem[]>([]);
  const [myWins, setMyWins] = useState<MyWinItem[]>([]);
  const [myWatchlist, setMyWatchlist] = useState<MyWatchItem[]>([]);
  const [sellerAnalytics, setSellerAnalytics] = useState<{
    totalRevenue: number;
    closedCount: number;
    soldCount: number;
    sellThroughRate: number;
    avgFinalStartingRatio: number;
    avgBidsPerAuction: number;
    dailyRevenue: Array<{ date: string; amount: number }>;
  } | null>(null);
  const [reviewModalAuction, setReviewModalAuction] = useState<{ id: string; title: string } | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [becomingSeller, setBecomingSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const promises: [
          Promise<{ bids: MyBidItem[] }>,
          Promise<{ wins: MyWinItem[] }>,
          Promise<{ watchlist: MyWatchItem[] }>,
          Promise<unknown>?,
        ] = [
          apiClient.getMyBids(),
          apiClient.getMyWins(),
          apiClient.getWatchlist(),
        ];

        if (user?.roles?.includes('seller')) {
          promises.push(apiClient.getSellerAnalyticsOverview());
        }

        const [bidsRes, winsRes, watchRes, analyticsRes] = await Promise.all(promises);
        setMyBids(Array.isArray(bidsRes?.bids) ? bidsRes.bids : []);
        setMyWins(Array.isArray(winsRes?.wins) ? winsRes.wins : []);
        setMyWatchlist(Array.isArray(watchRes?.watchlist) ? watchRes.watchlist : []);
        if (analyticsRes) {
          setSellerAnalytics(analyticsRes as typeof sellerAnalytics);
        }
      } catch {
        // Soft fail
      } finally {
        setLoadingActivities(false);
      }
    };

    void fetchActivities();
  }, [user]);

  if (!user) return null;

  const isSeller = Boolean(user.roles?.includes('seller'));
  const isVerified = Boolean(user.emailVerifiedAt);

  const handleBecomeSeller = async () => {
    setError(null);
    setSuccessMsg(null);
    setBecomingSeller(true);

    try {
      const res = await apiClient.becomeSeller();
      setUser(res.user);
      setSuccessMsg('You are now registered as an authenticated Nilami Seller!');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to enable seller account');
      }
    } finally {
      setBecomingSeller(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-nilami-sand-surface rounded-3xl p-6 sm:p-8 border border-nilami-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-nilami-green-dark text-white flex items-center justify-center font-display font-black text-2xl shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-black text-2xl text-nilami-text">
                {user.name}
              </h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-nilami-green-subtle text-nilami-green-dark border border-nilami-green/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-nilami-tan/65 text-nilami-warning-dark border border-nilami-border-strong">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unverified
                </span>
              )}
            </div>
            <p className="text-xs text-nilami-text/60">{user.email}</p>
            <div className="flex gap-2 mt-2">
              {(user?.roles || []).map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-nilami-sand text-nilami-text/80 border border-nilami-border/60"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          {!isSeller && (
            <button
              type="button"
              onClick={handleBecomeSeller}
              disabled={becomingSeller || !isVerified}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white font-bold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Store className="w-4 h-4 text-nilami-sand" />
              <span>{becomingSeller ? 'Activating...' : 'Become a Seller'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-nilami-danger-subtle border border-nilami-danger/30 text-nilami-danger-dark text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-nilami-green-subtle border border-nilami-green/40 text-nilami-green-dark text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-nilami-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          Overview & Stats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bids')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bids'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          <span>Active Bids</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'bids' ? 'bg-white/20 text-white' : 'bg-nilami-sand text-nilami-text'
            }`}
          >
            {(myBids || []).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'wins'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          <span>Won Lots</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'wins' ? 'bg-white/20 text-white' : 'bg-nilami-sand text-nilami-text'
            }`}
          >
            {(myWins || []).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'watchlist'
              ? 'bg-nilami-green-dark text-white shadow-sm'
              : 'text-nilami-text/70 hover:bg-nilami-sand/50'
          }`}
        >
          <span>Watchlist</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'watchlist' ? 'bg-white/20 text-white' : 'bg-nilami-sand text-nilami-text'
            }`}
          >
            {(myWatchlist || []).length}
          </span>
        </button>
        {isSeller && (
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-nilami-green-dark text-white shadow-sm'
                : 'text-nilami-text/70 hover:bg-nilami-sand/50'
            }`}
          >
            <BarChart3
              className={`w-3.5 h-3.5 ${
                activeTab === 'analytics' ? 'text-nilami-tan' : 'text-nilami-tan-dark'
              }`}
            />
            <span>Seller Analytics</span>
          </button>
        )}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-nilami-text/50 text-xs font-bold">
              <span>BIDS PLACED</span>
              <Gavel className="w-4 h-4 text-nilami-green-dark" />
            </div>
            <p className="text-3xl font-black text-nilami-text font-mono">
              {(myBids || []).length}
            </p>
          </div>

          <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-nilami-text/50 text-xs font-bold">
              <span>AUCTIONS WON</span>
              <Award className="w-4 h-4 text-nilami-green-dark" />
            </div>
            <p className="text-3xl font-black text-nilami-text font-mono">
              {(myWins || []).length}
            </p>
          </div>

          <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-nilami-text/50 text-xs font-bold">
              <span>AUCTIONS CONSIGNED</span>
              <TrendingUp className="w-4 h-4 text-nilami-tan-dark" />
            </div>
            <p className="text-3xl font-black text-nilami-text font-mono">
              {user?.stats?.auctionsSold ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Tab: My Bids */}
      {activeTab === 'bids' && (
        <div className="space-y-4">
          {loadingActivities ? (
            <div className="py-12 text-center text-xs text-nilami-text/50">Loading bids...</div>
          ) : (myBids || []).length === 0 ? (
            <div className="py-16 text-center bg-nilami-sand-surface rounded-3xl border border-nilami-border space-y-2">
              <Gavel className="w-8 h-8 text-nilami-tan-dark mx-auto" />
              <p className="font-bold text-nilami-text text-sm">No bids placed yet</p>
              <p className="text-xs text-nilami-text/60">
                Explore active catalog lots to place your first bid.
              </p>
              <Link
                to="/auctions"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-nilami-green-dark text-white text-xs font-bold"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-nilami-border/40 bg-nilami-sand-surface rounded-3xl border border-nilami-border overflow-hidden shadow-sm">
              {(myBids || []).map(({ auction, myHighestBid, leading }) => (
                <div
                  key={auction.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-nilami-sand/30 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={resolveImageUrl(auction.images[0]?.url) || getCategoryFallbackImage(auction.category)}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(auction.category);
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-nilami-border flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/auctions/${auction.id}`}
                          className="font-bold text-sm text-nilami-text hover:text-nilami-green-dark transition"
                        >
                          {auction.title}
                        </Link>
                        {leading ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-green-subtle text-nilami-green-dark border border-nilami-green/30">
                            Highest Bidder
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-danger-subtle text-nilami-danger-dark border border-nilami-danger/30">
                            Outbid
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-nilami-text/60">
                        <span>
                          Current Price:{' '}
                          <strong className="text-nilami-text">
                            {formatINR(auction.currentPrice)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Your Bid:{' '}
                          <strong className="text-nilami-text">
                            {formatINR(myHighestBid)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/auctions/${auction.id}`}
                    className="flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-nilami-sand text-nilami-text hover:bg-nilami-sand/80 transition"
                  >
                    <span>View Auction</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-nilami-tan-dark" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Wins */}
      {activeTab === 'wins' && (
        <div className="space-y-4">
          {loadingActivities ? (
            <div className="py-12 text-center text-xs text-nilami-text/50">Loading wins...</div>
          ) : (myWins || []).length === 0 ? (
            <div className="py-16 text-center bg-nilami-sand-surface rounded-3xl border border-nilami-border space-y-2">
              <Award className="w-8 h-8 text-nilami-tan-dark mx-auto" />
              <p className="font-bold text-nilami-text text-sm">No won auctions yet</p>
              <p className="text-xs text-nilami-text/60">
                When you win an auction, it will appear here for checkout.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-nilami-border/40 bg-nilami-sand-surface rounded-3xl border border-nilami-border overflow-hidden shadow-sm">
              {(myWins || []).map(({ auction, finalPrice }) => (
                <div
                  key={auction.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-nilami-sand/30 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={resolveImageUrl(auction.images[0]?.url) || getCategoryFallbackImage(auction.category)}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(auction.category);
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-nilami-border flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-nilami-text">
                          {auction.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-nilami-green-subtle text-nilami-green-dark border border-nilami-green/30">
                          Won
                        </span>
                      </div>
                      <p className="text-xs text-nilami-text/60">
                        Final Price:{' '}
                        <strong className="text-nilami-text font-mono">
                          {formatINR(finalPrice)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {auction.status === 'payment_pending' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await apiClient.createCheckoutSession(auction.id);
                            if (res.checkoutUrl) {
                              window.location.href = res.checkoutUrl;
                            }
                          } catch {
                            alert('Failed to initiate Stripe checkout.');
                          }
                        }}
                        className="px-4 py-2 bg-nilami-green-dark hover:bg-nilami-green-pressed text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-nilami-sand" />
                        <span>Pay Now ({formatINR(finalPrice)})</span>
                      </button>
                    )}

                    {auction.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setReviewModalAuction({ id: auction.id, title: auction.title })}
                        className="px-3.5 py-2 bg-nilami-sand hover:bg-nilami-sand/80 text-nilami-text text-xs font-bold rounded-xl border border-nilami-border transition cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-nilami-tan-dark" />
                        <span>Review Seller</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Watchlist */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4">
          {loadingActivities ? (
            <div className="py-12 text-center text-xs text-nilami-text/50">Loading watchlist...</div>
          ) : (myWatchlist || []).length === 0 ? (
            <div className="py-16 text-center bg-nilami-sand-surface rounded-3xl border border-nilami-border space-y-2">
              <Bookmark className="w-8 h-8 text-nilami-tan-dark mx-auto" />
              <p className="font-bold text-nilami-text text-sm">No watched lots</p>
              <p className="text-xs text-nilami-text/60">
                Click the watch button on any lot to track live bids.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-nilami-border/40 bg-nilami-sand-surface rounded-3xl border border-nilami-border overflow-hidden shadow-sm">
              {(myWatchlist || []).map(({ id, auction, reminderMinutesBefore }) => (
                <div
                  key={id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-nilami-sand/30 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={resolveImageUrl(auction.images[0]?.url) || getCategoryFallbackImage(auction.category)}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(auction.category);
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-nilami-border flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <Link
                        to={`/auctions/${auction.id}`}
                        className="font-bold text-sm text-nilami-text hover:text-nilami-green-dark transition"
                      >
                        {auction.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-nilami-text/60">
                        <span>Current: <strong className="text-nilami-text">{formatINR(auction.currentPrice)}</strong></span>
                        {reminderMinutesBefore && (
                          <>
                            <span>•</span>
                            <span className="text-nilami-green-dark font-bold">
                              {reminderMinutesBefore}m reminder set
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/auctions/${auction.id}`}
                    className="flex items-center gap-1 px-4 py-2 bg-nilami-green-dark hover:bg-nilami-green-pressed text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <span>View & Bid</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-nilami-sand" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Seller Analytics */}
      {activeTab === 'analytics' && sellerAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text/50">
                Total Succeeded Revenue
              </span>
              <p className="text-xl font-black text-nilami-text font-mono">
                {formatINR(sellerAnalytics.totalRevenue)}
              </p>
            </div>

            <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text/50">
                Sell-Through Rate
              </span>
              <p className="text-xl font-black text-nilami-green-dark font-mono">
                {sellerAnalytics.sellThroughRate}%
              </p>
            </div>

            <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text/50">
                Avg Final / Starting Ratio
              </span>
              <p className="text-xl font-black text-nilami-tan-dark font-mono">
                {sellerAnalytics.avgFinalStartingRatio}x
              </p>
            </div>

            <div className="bg-nilami-sand-surface p-5 rounded-2xl border border-nilami-border shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-nilami-text/50">
                Avg Bids Per Auction
              </span>
              <p className="text-xl font-black text-nilami-text font-mono">
                {sellerAnalytics.avgBidsPerAuction}
              </p>
            </div>
          </div>

          <div className="bg-nilami-sand-surface rounded-3xl p-6 border border-nilami-border shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-nilami-text">
              14-Day Daily Revenue Progression
            </h3>
            {!sellerAnalytics.dailyRevenue || sellerAnalytics.dailyRevenue.length === 0 ? (
              <p className="text-xs text-nilami-text/50 py-8 text-center">
                No payment data recorded in the last 14 days.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(sellerAnalytics.dailyRevenue || []).map((d) => ({
                      ...d,
                      amountRupees: Math.round(d.amount / 100),
                    }))}
                  >
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--nilami-text-muted)' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--nilami-text-muted)' }}
                      tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                    />
                    <Tooltip
                      formatter={(val: number | string | readonly (string | number)[] | undefined) => [
                        typeof val === 'number' || typeof val === 'string'
                          ? formatINR(Number(val) * 100)
                          : '',
                        'Revenue',
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--nilami-ivory)',
                        color: 'var(--nilami-text)',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        border: '1px solid var(--nilami-border-strong)',
                        fontWeight: 'bold',
                      }}
                    />
                    <Bar dataKey="amountRupees" fill="var(--nilami-green-dark)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalAuction && (
        <ReviewModal
          auctionId={reviewModalAuction.id}
          auctionTitle={reviewModalAuction.title}
          onClose={() => setReviewModalAuction(null)}
          onSuccess={() => {
            setSuccessMsg('Thank you for rating your seller!');
          }}
        />
      )}
    </div>
  );
};
