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
  section?: string; // Section grouping
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    requiredPermission: PERMISSIONS.VIEW_DASHBOARD,
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
    section: 'inventory',
  },
  {
    label: 'Purchase Orders',
    href: '/inventory/purchase-orders',
    requiredPermission: PERMISSIONS.PURCHASE_ORDER_MANAGEMENT,
    section: 'inventory',
  },
  {
    label: 'Supplier Management',
    href: '/suppliers',
    requiredPermission: PERMISSIONS.SUPPLIER_MANAGEMENT,
    section: 'suppliers',
  },
  {
    label: 'Invoice Management',
    href: '/invoices',
    requiredPermission: PERMISSIONS.INVOICE_MANAGEMENT,
    section: 'invoices',
  },
  {
    label: 'User Management',
    href: '/admin/users',
    superAdminOnly: true, // Only super admin can access
    section: 'admin',
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
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

  // Group items by section
  const sections: NavSection[] = [
    {
      title: 'General',
      items: filteredNavItems.filter(item => !item.section),
    },
    {
      title: 'Inventory',
      items: filteredNavItems.filter(item => item.section === 'inventory'),
    },
    {
      title: 'Suppliers',
      items: filteredNavItems.filter(item => item.section === 'suppliers'),
    },
    {
      title: 'Invoices',
      items: filteredNavItems.filter(item => item.section === 'invoices'),
    },
    {
      title: 'Admin',
      items: filteredNavItems.filter(item => item.section === 'admin'),
    },
  ].filter(section => section.items.length > 0); // Only show sections with items

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl">
      <div className="flex h-14 min-h-14 shrink-0 items-center justify-between border-b border-blue-500/30 px-4 sm:px-6 bg-blue-600/50 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent truncate">Multi Car Repair</h1>
          {userCompany && (
            <p className="text-xs text-blue-100 mt-0.5 truncate font-medium" title={userCompany.name}>
              {userCompany.name}
            </p>
          )}
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-2 rounded-lg text-white/90 hover:bg-white/10"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
        <nav className="space-y-2">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onMobileClose}
                    className={`flex items-center rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md hover:backdrop-blur-sm'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-blue-500/30 p-3 sm:p-4 bg-blue-600/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/10 text-white text-sm font-bold shadow-lg border border-white/30">
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

  return (
    <>
      {/* Mobile backdrop */}
      {onMobileClose && (
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      {/* Sidebar: drawer on mobile, static on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 h-screen w-64 transform transition-transform duration-200 ease-out md:relative md:translate-x-0 md:inset-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}

