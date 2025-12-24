'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/roles';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    roles: ['ADMIN', 'SERVICE_ADVISOR', 'INVENTORY_MANAGER', 'MECHANIC', 'ACCOUNTANT'],
  },
  {
    label: 'Quick Check-in',
    href: '/jobs/create',
    roles: ['ADMIN', 'SERVICE_ADVISOR'],
  },
  {
    label: 'Status Board',
    href: '/jobs/board',
    roles: ['ADMIN', 'SERVICE_ADVISOR', 'MECHANIC'],
  },
  {
    label: 'My Jobs',
    href: '/jobs/list',
    roles: ['ADMIN', 'SERVICE_ADVISOR'],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    roles: ['ADMIN', 'INVENTORY_MANAGER'],
  },
  {
    label: 'Suppliers',
    href: '/inventory/suppliers',
    roles: ['ADMIN', 'INVENTORY_MANAGER'],
  },
  {
    label: 'Purchase Orders',
    href: '/inventory/purchase-orders',
    roles: ['ADMIN', 'INVENTORY_MANAGER'],
  },
  {
    label: 'User Management',
    href: '/admin/users',
    roles: ['ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, userData, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (!userRole) return null;

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen w-64 flex-col bg-zinc-900 text-zinc-50">
      <div className="flex h-16 items-center border-b border-zinc-800 px-6">
        <h1 className="text-xl font-bold">Multi Car Repair</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-50">
              {userData?.displayName || 'User'}
            </p>
            <p className="text-xs text-zinc-400">
              {userRole ? getRoleDisplayName(userRole) : ''}
            </p>
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

