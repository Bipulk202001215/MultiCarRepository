'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requireAdmin?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  requireAdmin = false,
  fallbackPath = '/',
}: ProtectedRouteProps) {
  const { currentUser, userRole, loading, isUserAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if user is authenticated
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isUserAdmin) {
      router.push(fallbackPath);
      return;
    }

    // Check specific role requirement
    if (requiredRole && userRole !== requiredRole) {
      router.push(fallbackPath);
      return;
    }

    // Check allowed roles (multiple roles)
    if (allowedRoles && allowedRoles.length > 0) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [currentUser, userRole, loading, isUserAdmin, requireAdmin, requiredRole, allowedRoles, router, fallbackPath]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated
  if (!currentUser) {
    return null;
  }

  // Don't render if admin required but user is not admin
  if (requireAdmin && !isUserAdmin) {
    return null;
  }

  // Don't render if specific role required but user doesn't have it
  if (requiredRole && userRole !== requiredRole) {
    return null;
  }

  // Don't render if allowed roles specified but user role not in list
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return null;
    }
  }

  return <>{children}</>;
}

