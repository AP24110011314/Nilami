import React from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { OutbidBanner } from '../notifications/OutbidBanner.js';
import { useServerClock } from '../../hooks/useServerClock.js';

export const Layout: React.FC = () => {
  useServerClock();

  return (
    <div className="min-h-screen flex flex-col bg-nilami-ivory dark:bg-nilami-dark-bg text-nilami-text dark:text-nilami-dark-text selection:bg-nilami-green selection:text-white transition-colors duration-200">
      <Header />
      <OutbidBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
