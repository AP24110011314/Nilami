import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          &copy; {new Date().getFullYear()} Nilami. Real-time auction platform. All rights reserved.
        </div>
        <div className="flex gap-4">
          <span>Server Clock Authoritative</span>
          <span>•</span>
          <span>Paise Integer Accounting</span>
          <span>•</span>
          <span>Port 4000 Native</span>
        </div>
      </div>
    </footer>
  );
};

