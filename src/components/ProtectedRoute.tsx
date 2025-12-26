'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Permission } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole; // Legacy - for backward compatibility
  allowedRoles?: UserRole[]; // Legacy - for backward compatibility
  requiredPermission?: Permission;
  allowedPermissions?: Permission[];
  requireAdmin?: boolean;
  fallbackPath?: string;
  allowInitialSetup?: boolean; // Allow access during initial setup (no permissions yet)
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  requiredPermission,
  allowedPermissions,
  requireAdmin = false,
  fallbackPath = '/',
  allowInitialSetup = false,
}: ProtectedRouteProps) {
  const { 
    currentUser, 
    userRole, 
    userRoles,
    userPermissions,
    hasPermission,
    loading, 
    isUserAdmin 
  } = useAuth();
  const router = useRouter();
  
  // Check if user has no permissions (initial setup state) OR has ADMIN role (legacy)
  const hasAdminRole = userRole === 'ADMIN' || (userRoles && userRoles.some(r => r.name === 'ADMIN'));
  const isInitialSetup = allowInitialSetup && 
    ((userPermissions && userPermissions.length === 0) && (userRoles && userRoles.length === 0)) ||
    hasAdminRole;

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

    // Check permission-based access (new system - takes priority)
    // Allow access during initial setup if allowInitialSetup is true
    if (requiredPermission) {
      if (!isInitialSetup && !hasPermission(requiredPermission)) {
        router.push(fallbackPath);
        return;
      }
    }

    if (allowedPermissions && allowedPermissions.length > 0) {
      const hasAnyPermission = allowedPermissions.some(perm => hasPermission(perm));
      if (!isInitialSetup && !hasAnyPermission) {
        router.push(fallbackPath);
        return;
      }
    }

    // Check role-based access (legacy - for backward compatibility)
    if (requiredRole) {
      const hasRole = userRoles.some(role => role.name === requiredRole) || userRole === requiredRole;
      if (!hasRole) {
        router.push(fallbackPath);
        return;
      }
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const hasAnyRole = userRoles.some(role => allowedRoles.includes(role.name)) || 
                         (userRole && allowedRoles.includes(userRole));
      if (!hasAnyRole) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [
    currentUser, 
    userRole, 
    userRoles,
    userPermissions,
    hasPermission,
    loading, 
    isUserAdmin, 
    requireAdmin, 
    requiredRole, 
    allowedRoles,
    requiredPermission,
    allowedPermissions,
    router, 
    fallbackPath,
    allowInitialSetup
  ]);

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

  // Don't render if permission required but user doesn't have it (unless initial setup)
  if (requiredPermission && !isInitialSetup && !hasPermission(requiredPermission)) {
    return null;
  }

  // Don't render if allowed permissions specified but user doesn't have any (unless initial setup)
  if (allowedPermissions && allowedPermissions.length > 0) {
    const hasAnyPermission = allowedPermissions.some(perm => hasPermission(perm));
    if (!isInitialSetup && !hasAnyPermission) {
      return null;
    }
  }

  // Don't render if specific role required but user doesn't have it (legacy)
  if (requiredRole) {
    const hasRole = userRoles.some(role => role.name === requiredRole) || userRole === requiredRole;
    if (!hasRole) {
      return null;
    }
  }

  // Don't render if allowed roles specified but user role not in list (legacy)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAnyRole = userRoles.some(role => allowedRoles.includes(role.name)) || 
                       (userRole && allowedRoles.includes(userRole));
    if (!hasAnyRole) {
      return null;
    }
  }

  return <>{children}</>;
}

