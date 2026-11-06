import React from 'react';
import { Link } from 'react-router';
import { Gavel, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
          <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
            <Gavel className="w-5 h-5" />
          </div>
          <span>Nilami</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-indigo-600 transition-colors">
            Home
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-time Active</span>
          </div>
        </nav>
      </div>
    </header>
  );
};
