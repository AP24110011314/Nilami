import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '../../store/auth.js';
import { apiClient, ApiError, type AuctionItem } from '../../api/client.js';
import { formatINR } from '../../lib/money.js';
import {
  User,
  CheckCircle2,
  AlertTriangle,
  Store,
  Gavel,
  Award,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

interface MyBidItem {
  auction: AuctionItem;
  myHighestBid: number;
  leading: boolean;
}

interface MyWinItem {
  auction: AuctionItem;
  finalPrice: number;
}

export const DashboardPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'bids' | 'wins'>('overview');

  const [myBids, setMyBids] = useState<MyBidItem[]>([]);
  const [myWins, setMyWins] = useState<MyWinItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [becomingSeller, setBecomingSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const [bidsRes, winsRes] = await Promise.all([
          apiClient.getMyBids(),
          apiClient.getMyWins(),
        ]);
        setMyBids(bidsRes.bids);
        setMyWins(winsRes.wins);
      } catch {
        // Soft fail
      } finally {
        setLoadingActivities(false);
      }
    };

    void fetchActivities();
  }, []);

  if (!user) return null;

  const isSeller = user.roles.includes('seller');
  const isVerified = Boolean(user.emailVerifiedAt);

  const handleBecomeSeller = async () => {
    setError(null);
    setSuccessMsg(null);
    setBecomingSeller(true);

    try {
      const res = await apiClient.becomeSeller();
      setUser(res.user);
      setSuccessMsg('You are now registered as a Nilami Seller!');
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unverified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex gap-2 mt-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700"
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
              onClick={handleBecomeSeller}
              disabled={becomingSeller || !isVerified}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>{becomingSeller ? 'Activating...' : 'Become a Seller'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab('bids')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bids'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Active Bids</span>
          <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[10px]">
            {myBids.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('wins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'wins'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Won Lots</span>
          <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded-full text-[10px]">
            {myWins.length}
          </span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>BIDS PLACED</span>
              <Gavel className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{myBids.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>AUCTIONS WON</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{myWins.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>AUCTIONS SOLD</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{user.stats.auctionsSold}</p>
          </div>
        </div>
      )}

      {/* Tab: My Bids */}
      {activeTab === 'bids' && (
        <div className="space-y-4">
          {loadingActivities ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your bids...</div>
          ) : myBids.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Gavel className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">No bids placed yet</p>
              <p className="text-xs text-slate-500">Explore active catalog lots to place your first bid.</p>
              <Link
                to="/auctions"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {myBids.map(({ auction, myHighestBid, leading }) => (
                <div
                  key={auction.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={auction.images[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/auctions/${auction.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition"
                        >
                          {auction.title}
                        </Link>
                        {leading ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Highest Bidder
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Outbid
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Current Price: <strong className="text-slate-900">{formatINR(auction.currentPrice)}</strong></span>
                        <span>•</span>
                        <span>Your Highest: <strong>{formatINR(myHighestBid)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/auctions/${auction.id}`}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    <span>View Auction</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
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
            <div className="py-12 text-center text-xs text-slate-400">Loading wins...</div>
          ) : myWins.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">No won auctions yet</p>
              <p className="text-xs text-slate-500">When you win an auction, it will appear here for checkout.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {myWins.map(({ auction, finalPrice }) => (
                <div
                  key={auction.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={auction.images[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{auction.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Won
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Final Price: <strong className="text-slate-900">{formatINR(finalPrice)}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-500">
                    Payment opens in Phase 6 (Stripe Checkout)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
