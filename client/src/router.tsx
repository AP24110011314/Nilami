import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/layout/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { useAuthStore } from './store/auth.js';
import { apiClient } from './api/client.js';

export const AppRouter: React.FC = () => {
  const { setAuth, setInitialized } = useAuthStore();

  // On application mount, attempt silent refresh from httpOnly cookie
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const refreshData = await apiClient.refresh();
        const meData = await apiClient.request<{ user: import('./store/auth.js').User }>('/users/me', {
          headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        });
        setAuth(meData.user, refreshData.accessToken);
      } catch {
        // No active refresh session, proceed unauthenticated
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
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
