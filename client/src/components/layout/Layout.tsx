import React from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { OutbidBanner } from '../notifications/OutbidBanner.js';
import { useServerClock } from '../../hooks/useServerClock.js';

export const Layout: React.FC = () => {
  useServerClock();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-nilami-ivory text-nilami-text selection:bg-nilami-tan selection:text-nilami-text">
      <Header />
      <OutbidBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
