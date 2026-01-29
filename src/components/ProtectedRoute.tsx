import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Permission } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  allowedPermissions?: Permission[];
  requireAdmin?: boolean;
  fallbackPath?: string;
  allowInitialSetup?: boolean;
}

export default function ProtectedRoute({
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
  const navigate = useNavigate();
  
  const hasAdminRole = userRole === 'ADMIN' || (userRoles && userRoles.some(r => r.name === 'ADMIN'));
  const isInitialSetup = allowInitialSetup && 
    ((userPermissions && userPermissions.length === 0) && (userRoles && userRoles.length === 0)) ||
    hasAdminRole;

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (requireAdmin && !isUserAdmin) {
      navigate(fallbackPath);
      return;
    }

    if (requiredPermission) {
      if (!isInitialSetup && !hasPermission(requiredPermission)) {
        navigate(fallbackPath);
        return;
      }
    }

    if (allowedPermissions && allowedPermissions.length > 0) {
      const hasAnyPermission = allowedPermissions.some(perm => hasPermission(perm));
      if (!isInitialSetup && !hasAnyPermission) {
        navigate(fallbackPath);
        return;
      }
    }

    if (requiredRole) {
      const hasRole = userRoles.some(role => role.name === requiredRole) || userRole === requiredRole;
      if (!hasRole) {
        navigate(fallbackPath);
        return;
      }
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const hasAnyRole = userRoles.some(role => allowedRoles.includes(role.name)) || 
                         (userRole && allowedRoles.includes(userRole));
      if (!hasAnyRole) {
        navigate(fallbackPath);
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
    navigate, 
    fallbackPath,
    allowInitialSetup,
    isInitialSetup
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (requireAdmin && !isUserAdmin) {
    return null;
  }

  if (requiredPermission && !isInitialSetup && !hasPermission(requiredPermission)) {
    return null;
  }

  if (allowedPermissions && allowedPermissions.length > 0) {
    const hasAnyPermission = allowedPermissions.some(perm => hasPermission(perm));
    if (!isInitialSetup && !hasAnyPermission) {
      return null;
    }
  }

  if (requiredRole) {
    const hasRole = userRoles.some(role => role.name === requiredRole) || userRole === requiredRole;
    if (!hasRole) {
      return null;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAnyRole = userRoles.some(role => allowedRoles.includes(role.name)) || 
                       (userRole && allowedRoles.includes(userRole));
    if (!hasAnyRole) {
      return null;
    }
  }

  return <>{children}</>;
}
