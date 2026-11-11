import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/auth.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'buyer' | 'seller' | 'admin';
  requireVerified?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireVerified,
}) => {
  const { user, accessToken, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nilami-green-dark"></div>
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && !user.emailVerifiedAt) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-nilami-tan/60 border border-nilami-border-strong rounded-2xl text-nilami-text space-y-4">
        <h3 className="font-bold text-lg">Email Verification Required</h3>
        <p className="text-sm">
          You must verify your email address before accessing this page. Please check your inbox or Mailpit.
        </p>
      </div>
    );
  }

  if (requiredRole && !user.roles.includes(requiredRole)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-nilami-danger-subtle border border-nilami-danger-border rounded-2xl text-nilami-danger-dark space-y-4">
        <h3 className="font-bold text-lg">Access Denied</h3>
        <p className="text-sm">You do not have the required permissions to view this section.</p>
      </div>
    );
  }

  return <>{children}</>;
};

