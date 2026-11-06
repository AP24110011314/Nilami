import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/layout/Layout.js';
import { HomePage } from './pages/HomePage.js';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
