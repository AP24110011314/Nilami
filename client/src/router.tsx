import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/layout/Layout.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { useAuthStore } from './store/auth.js';
import { apiClient } from './api/client.js';
import { Loader2 } from 'lucide-react';

// Route-level code splitting
const HomePage = lazy(() => import('./pages/HomePage.js').then((m) => ({ default: m.HomePage })));
const BrowsePage = lazy(() => import('./pages/auctions/BrowsePage.js').then((m) => ({ default: m.BrowsePage })));
const AuctionDetailPage = lazy(() => import('./pages/auctions/AuctionDetailPage.js').then((m) => ({ default: m.AuctionDetailPage })));
const CreateAuctionPage = lazy(() => import('./pages/seller/CreateAuctionPage.js').then((m) => ({ default: m.CreateAuctionPage })));
const EditAuctionPage = lazy(() => import('./pages/seller/EditAuctionPage.js').then((m) => ({ default: m.EditAuctionPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage.js').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.js').then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.js').then((m) => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.js').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.js').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.js').then((m) => ({ default: m.DashboardPage })));
const PaymentSuccessPage = lazy(() => import('./pages/payments/PaymentSuccessPage.js').then((m) => ({ default: m.PaymentSuccessPage })));
const PaymentSettingsPage = lazy(() => import('./pages/settings/PaymentSettingsPage.js').then((m) => ({ default: m.PaymentSettingsPage })));
const AdminPage = lazy(() => import('./pages/admin/AdminPage.js').then((m) => ({ default: m.AdminPage })));

const RouteLoadingSpinner: React.FC = () => (
  <div className="py-24 text-center space-y-3">
    <Loader2 className="w-8 h-8 text-nilami-green-dark animate-spin mx-auto" />
    <p className="text-xs font-semibold text-nilami-text-muted">
      Loading view...
    </p>
  </div>
);

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
      <Suspense fallback={<RouteLoadingSpinner />}>
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
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
