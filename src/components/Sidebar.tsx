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
    <div className="flex h-screen w-64 flex-col bg-zinc-900 text-zinc-50">
      <div className="flex h-16 items-center border-b border-zinc-800 px-6">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Multi Car Repair</h1>
          {userCompany && (
            <p className="text-xs text-zinc-400 mt-1 truncate" title={userCompany.name}>
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
                className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
            {(userData?.displayName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-50 truncate">
              {userData?.displayName || 'User'}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {userRoles && userRoles.length > 0 
                ? userRoles.map(r => getRoleDisplayName(r.name)).join(', ')
                : userRole 
                  ? getRoleDisplayName(userRole) 
                  : 'No role'}
            </p>
            {userIsSuperAdmin && (
              <p className="text-xs text-green-400 mt-1">👑 Super Admin</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

