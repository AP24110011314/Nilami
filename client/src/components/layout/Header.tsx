import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Gavel,
  Activity,
  LogOut,
  PlusCircle,
  Search,
  Menu,
  X,
  Compass,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.js';
import { apiClient } from '../../api/client.js';
import { NotificationBell } from '../notifications/NotificationBell.js';

export const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch {
      // Clean state regardless of network response
    }
    clearAuth();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/auctions?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isSeller = user?.roles.includes('seller');
  const isAdmin = user?.roles.includes('admin');

  return (
    <header className="sticky top-0 z-50 bg-nilami-ivory/95 backdrop-blur-md border-b border-nilami-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-nilami-green rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-nilami-green-dark text-white flex items-center justify-center shadow-sm group-hover:bg-nilami-green-pressed transition-colors">
              <Gavel className="w-5 h-5 text-nilami-sand" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl tracking-tight text-nilami-text leading-none">
                Nilami
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-nilami-tan-dark leading-tight">
                Live Auctions
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-nilami-text-secondary">
            <Link
              to="/"
              className="hover:text-nilami-green-dark transition-colors py-1 px-2 rounded-lg hover:bg-nilami-sand/40"
            >
              Home
            </Link>
            <Link
              to="/auctions"
              className="hover:text-nilami-green-dark transition-colors py-1 px-2 rounded-lg hover:bg-nilami-sand/40 flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-nilami-tan-dark" />
              <span>Browse Lots</span>
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="hover:text-nilami-green-dark transition-colors py-1 px-2 rounded-lg hover:bg-nilami-sand/40 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4 text-nilami-tan-dark" />
                <span>Dashboard</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="text-nilami-danger-dark font-semibold hover:opacity-80 transition py-1 px-2 rounded-lg hover:bg-nilami-danger-subtle/50 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-nilami-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, category, or brand..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-nilami-ivory-surface border border-nilami-border text-nilami-text placeholder:text-nilami-text-muted focus:outline-none focus:border-nilami-green-dark focus:ring-1 focus:ring-nilami-green-dark transition-all"
            />
          </form>
        </div>

        {/* Right: Actions, Theme, Status, User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Native Port 4000 indicator */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nilami-tan/65 border border-nilami-border-strong text-nilami-text text-[11px] font-semibold"
            title="Nilami Native Core running on Port 4000 (No Docker)"
          >
            <Activity className="w-3.5 h-3.5 text-nilami-green-dark animate-pulse" />
            <span>Port 4000</span>
          </div>

          {isSeller && (
            <Link
              to="/seller/new"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white text-xs font-bold transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>List Item</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-nilami-sand/60 hover:bg-nilami-sand text-nilami-text text-xs font-semibold border border-nilami-border transition"
              >
                <div className="w-5 h-5 rounded-full bg-nilami-green-dark text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 rounded-xl text-nilami-text-muted hover:text-nilami-danger-dark hover:bg-nilami-danger-subtle/50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-semibold text-nilami-text/80 hover:text-nilami-green-dark transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-nilami-green-dark hover:bg-nilami-green-pressed text-white transition shadow-sm"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl text-nilami-text/70 hover:bg-nilami-sand/50 transition cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-nilami-border bg-nilami-ivory-surface px-4 py-4 space-y-4 shadow-lg animate-in fade-in duration-200">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-nilami-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-nilami-ivory border border-nilami-border text-nilami-text placeholder:text-nilami-text-muted focus:outline-none focus:border-nilami-green-dark"
            />
          </form>

          <nav className="flex flex-col space-y-1 text-sm font-medium text-nilami-text">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-nilami-sand/50 transition"
            >
              Home
            </Link>
            <Link
              to="/auctions"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-nilami-sand/50 transition flex items-center justify-between"
            >
              <span>Browse Catalog</span>
              <Compass className="w-4 h-4 text-nilami-tan-dark" />
            </Link>
            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-nilami-sand/50 transition flex items-center justify-between"
              >
                <span>Dashboard</span>
                <LayoutDashboard className="w-4 h-4 text-nilami-tan-dark" />
              </Link>
            )}
            {isSeller && (
              <Link
                to="/seller/new"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl bg-nilami-green-dark text-white font-bold text-xs flex items-center justify-between"
              >
                <span>List New Item</span>
                <PlusCircle className="w-4 h-4" />
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-nilami-danger-dark font-bold text-xs flex items-center justify-between"
              >
                <span>Admin Portal</span>
                <ShieldAlert className="w-4 h-4" />
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
