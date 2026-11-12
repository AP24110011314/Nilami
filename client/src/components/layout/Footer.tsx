import React from 'react';
import { Link } from 'react-router';
import { Gavel, ShieldCheck, Clock, Coins, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-nilami-sand-surface border-t border-nilami-border mt-auto pt-12 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-nilami-green-dark text-white flex items-center justify-center">
                <Gavel className="w-4 h-4 text-nilami-tan" />
              </div>
              <span className="font-display font-black text-2xl tracking-tight text-nilami-text leading-none">
                Nilami
              </span>
            </Link>
            <p className="text-xs text-nilami-text-secondary max-w-sm leading-relaxed">
              Nilami is a high-assurance, real-time live auction platform. Built with MongoDB atomic transactions,
              authoritative cluster clock timestamps, integer paise financial accuracy, and sub-200ms Socket.IO synchronization.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-tan/70 border border-nilami-border text-nilami-text text-[11px] font-semibold">
                <Activity className="w-3 h-3 text-nilami-green-dark" />
                Live Socket Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-sand text-nilami-text text-[11px] font-semibold">
                <Clock className="w-3 h-3 text-nilami-tan-dark" />
                $$NOW Server Clock
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-sand text-nilami-text text-[11px] font-semibold">
                <Coins className="w-3 h-3 text-nilami-tan-dark" />
                Paise Integer
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-nilami-green-dark">
              Marketplace
            </h3>
            <ul className="space-y-2 text-xs text-nilami-text-secondary">
              <li>
                <Link to="/auctions" className="hover:text-nilami-text transition">
                  Browse All Lots
                </Link>
              </li>
              <li>
                <Link to="/auctions?sort=endingSoon" className="hover:text-nilami-text transition">
                  Ending Soon
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=electronics" className="hover:text-nilami-text transition">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=collectibles" className="hover:text-nilami-text transition">
                  Rare Collectibles
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=art" className="hover:text-nilami-text transition">
                  Fine Art
                </Link>
              </li>
            </ul>
          </div>

          {/* Guarantees & Trust */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-nilami-green-dark">
              Trust & Security
            </h3>
            <ul className="space-y-2 text-xs text-nilami-text-secondary">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark shrink-0" />
                <span>Anti-Snipe 30s Extension</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark shrink-0" />
                <span>Verified Webhook Settlement</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark shrink-0" />
                <span>Zero Client Time Trust</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark shrink-0" />
                <span>Fraud Rule Detection</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-nilami-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-nilami-text-muted">
          <div>
            &copy; {new Date().getFullYear()} Nilami Auction Systems. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Bidding</span>
            <span>•</span>
            <span>Escrow Protocol</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
