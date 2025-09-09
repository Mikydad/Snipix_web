/**
 * Protected Route Component
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEmailVerified?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireEmailVerified = false,
  requireAdmin = false,
  redirectTo,
}) => {
  const { state } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  // Handle authentication requirement
  if (requireAuth && !state.isAuthenticated) {
    const loginPath = redirectTo || '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Handle email verification requirement
  if (requireEmailVerified && state.user && !state.user.is_email_verified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  // Handle admin requirement
  if (requireAdmin && state.user && state.user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Handle user status
  if (state.user && state.user.status !== 'active') {
    if (state.user.status === 'pending') {
      return <Navigate to="/verify-email" state={{ from: location }} replace />;
    } else if (state.user.status === 'suspended') {
      return <Navigate to="/suspended" replace />;
    } else if (state.user.status === 'inactive') {
      return <Navigate to="/inactive" replace />;
    }
  }

  // If all checks pass, render children
  return <>{children}</>;
};

export default ProtectedRoute;
