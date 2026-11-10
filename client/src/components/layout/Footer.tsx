import React from 'react';
import { Link } from 'react-router';
import { Gavel, ShieldCheck, Clock, Coins, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-nilami-sand-surface dark:bg-nilami-dark-surface border-t border-nilami-border dark:border-nilami-dark-border mt-auto pt-12 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-nilami-green-dark text-white flex items-center justify-center">
                <Gavel className="w-4 h-4 text-nilami-sand" />
              </div>
              <span className="font-display font-black text-2xl tracking-tight text-nilami-green-dark dark:text-nilami-sand">
                Nilami
              </span>
            </Link>
            <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 max-w-sm leading-relaxed">
              Nilami is a high-assurance, real-time live auction platform. Built with MongoDB atomic transactions,
              authoritative cluster clock timestamps, integer paise financial accuracy, and sub-200ms Socket.IO synchronization.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-green-subtle/50 dark:bg-nilami-green-dark/20 text-nilami-green-dark dark:text-nilami-sand text-[11px] font-semibold">
                <Activity className="w-3 h-3" />
                Port 4000 Native
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-sand dark:bg-nilami-dark-surface-elevated text-nilami-text/80 dark:text-nilami-dark-text/80 text-[11px] font-semibold">
                <Clock className="w-3 h-3 text-nilami-tan" />
                $$NOW Server Clock
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-nilami-sand dark:bg-nilami-dark-surface-elevated text-nilami-text/80 dark:text-nilami-dark-text/80 text-[11px] font-semibold">
                <Coins className="w-3 h-3 text-nilami-tan" />
                Paise Integer
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-nilami-green-dark dark:text-nilami-sand">
              Marketplace
            </h3>
            <ul className="space-y-2 text-xs text-nilami-text/85 dark:text-nilami-dark-text/85">
              <li>
                <Link to="/auctions" className="hover:text-nilami-green-dark dark:hover:text-nilami-sand transition">
                  Browse All Lots
                </Link>
              </li>
              <li>
                <Link to="/auctions?sort=endingSoon" className="hover:text-nilami-green-dark dark:hover:text-nilami-sand transition">
                  Ending Soon
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=electronics" className="hover:text-nilami-green-dark dark:hover:text-nilami-sand transition">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=collectibles" className="hover:text-nilami-green-dark dark:hover:text-nilami-sand transition">
                  Rare Collectibles
                </Link>
              </li>
              <li>
                <Link to="/auctions?category=art" className="hover:text-nilami-green-dark dark:hover:text-nilami-sand transition">
                  Fine Art
                </Link>
              </li>
            </ul>
          </div>

          {/* Guarantees & Trust */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-nilami-green-dark dark:text-nilami-sand">
              Trust & Security
            </h3>
            <ul className="space-y-2 text-xs text-nilami-text/85 dark:text-nilami-dark-text/85">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark dark:text-nilami-green shrink-0" />
                <span>Anti-Snipe 30s Extension</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark dark:text-nilami-green shrink-0" />
                <span>Verified Stripe Webhooks</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark dark:text-nilami-green shrink-0" />
                <span>Zero Client Time Trust</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nilami-green-dark dark:text-nilami-green shrink-0" />
                <span>Fraud Rule Detection</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-nilami-border/70 dark:border-nilami-dark-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-nilami-text/80 dark:text-nilami-dark-text/80">
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
