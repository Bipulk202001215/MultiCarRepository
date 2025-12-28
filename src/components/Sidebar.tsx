import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/roles';
import { PERMISSIONS } from '@/lib/permissions';
import { Permission } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  requiredPermission?: Permission; // Permission-based access
  roles?: string[]; // Legacy role-based access
  superAdminOnly?: boolean; // Only super admin can see this
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    requiredPermission: PERMISSIONS.VIEW_DASHBOARD,
  },
  {
    label: 'Job Card Management',
    href: '/jobs/create',
    requiredPermission: PERMISSIONS.JOB_CARD_MANAGEMENT,
  },
  {
    label: 'Status Board',
    href: '/jobs/board',
    requiredPermission: PERMISSIONS.JOB_CARD_MANAGEMENT,
  },
  {
    label: 'My Jobs',
    href: '/jobs/list',
    requiredPermission: PERMISSIONS.JOB_CARD_MANAGEMENT,
  },
  {
    label: 'Inventory Management',
    href: '/inventory',
    requiredPermission: PERMISSIONS.INVENTORY_MANAGEMENT,
  },
  {
    label: 'Supplier Management',
    href: '/inventory/suppliers',
    requiredPermission: PERMISSIONS.SUPPLIER_MANAGEMENT,
  },
  {
    label: 'Purchase Orders',
    href: '/inventory/purchase-orders',
    requiredPermission: PERMISSIONS.PURCHASE_ORDER_MANAGEMENT,
  },
  {
    label: 'Invoice Management',
    href: '/invoices',
    requiredPermission: PERMISSIONS.INVOICE_MANAGEMENT,
  },
  {
    label: 'User Management',
    href: '/admin/users',
    superAdminOnly: true, // Only super admin can access
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, userData, userCompany, logout, hasPermission, userRoles, userPermissions, currentUser, isSuperAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Check if current user is super admin
  const userIsSuperAdmin = isSuperAdmin;

  // Check if user has ADMIN role (for legacy support)
  const hasAdminRole = userRole === 'ADMIN' || (userRoles && userRoles.some(r => r.name === 'ADMIN'));

  // Filter nav items based on permissions
  const filteredNavItems = navItems.filter((item) => {
    // Super admin only items - only super admin can see
    if (item.superAdminOnly) {
      return userIsSuperAdmin;
    }

    // Permission-based access (new system - takes priority)
    if (item.requiredPermission) {
      const hasPerm = hasPermission(item.requiredPermission);
      // If user has permission, show it
      if (hasPerm) return true;
      
      // Legacy support: If user has ADMIN role and no permissions set up yet, show these items:
      // - VIEW_DASHBOARD
      // - JOB_CARD_MANAGEMENT
      // - SUPPLIER_MANAGEMENT
      // - INVOICE_MANAGEMENT
      // - INVENTORY_MANAGEMENT
      if (hasAdminRole && (!userPermissions || userPermissions.length === 0)) {
        const adminAllowedPermissions = [
          PERMISSIONS.VIEW_DASHBOARD,
          PERMISSIONS.JOB_CARD_MANAGEMENT,
          PERMISSIONS.SUPPLIER_MANAGEMENT,
          PERMISSIONS.INVOICE_MANAGEMENT,
          PERMISSIONS.INVENTORY_MANAGEMENT,
        ];
        return adminAllowedPermissions.includes(item.requiredPermission);
      }
      
      return false;
    }

    // Legacy role-based access (fallback)
    if (item.roles && item.roles.length > 0) {
      const hasRole = userRole && item.roles.includes(userRole) ||
        (userRoles && userRoles.some(r => item.roles!.includes(r.name)));
      return hasRole;
    }

    // If no permission or role specified, don't show
    return false;
  });

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl">
      <div className="flex h-16 items-center border-b border-blue-500/30 px-6 bg-blue-600/50 backdrop-blur-sm">
        <div className="flex-1">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Multi Car Repair</h1>
          {userCompany && (
            <p className="text-xs text-blue-100 mt-1 truncate font-medium" title={userCompany.name}>
              {userCompany.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30 transform scale-105'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md hover:backdrop-blur-sm'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-blue-500/30 p-4 bg-blue-600/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/10 text-white text-sm font-bold shadow-lg border border-white/30">
            {(userData?.displayName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {userData?.displayName || 'User'}
            </p>
            <p className="text-xs text-blue-100 truncate font-medium">
              {userRoles && userRoles.length > 0 
                ? userRoles.map(r => getRoleDisplayName(r.name)).join(', ')
                : userRole 
                  ? getRoleDisplayName(userRole) 
                  : 'No role'}
            </p>
            {userIsSuperAdmin && (
              <p className="text-xs text-yellow-300 mt-1 font-bold">👑 Super Admin</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

