import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/layout/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { BrowsePage } from './pages/auctions/BrowsePage.js';
import { AuctionDetailPage } from './pages/auctions/AuctionDetailPage.js';
import { CreateAuctionPage } from './pages/seller/CreateAuctionPage.js';
import { EditAuctionPage } from './pages/seller/EditAuctionPage.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { PaymentSuccessPage } from './pages/payments/PaymentSuccessPage.js';
import { PaymentSettingsPage } from './pages/settings/PaymentSettingsPage.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { useAuthStore } from './store/auth.js';
import { apiClient } from './api/client.js';

export const AppRouter: React.FC = () => {
  const { setAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const refreshData = await apiClient.refresh();
        const meData = await apiClient.request<{ user: import('./store/auth.js').User }>('/users/me', {
          headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        });
        setAuth(meData.user, refreshData.accessToken);
      } catch {
        setInitialized(true);
      }
    };

    void initializeAuth();
  }, [setAuth, setInitialized]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/auctions" element={<BrowsePage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route
            path="/seller/new"
            element={
              <ProtectedRoute requiredRole="seller" requireVerified={true}>
                <CreateAuctionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/auctions/:id/edit"
            element={
              <ProtectedRoute requiredRole="seller">
                <EditAuctionPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/payments/success" element={<PaymentSuccessPage />} />
          <Route
            path="/settings/payments"
            element={
              <ProtectedRoute>
                <PaymentSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
