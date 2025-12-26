'use client';

import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { PERMISSIONS, getPermissionDisplayName } from "@/lib/permissions";

export default function Home() {
  const { 
    currentUser, 
    userData, 
    userCompany,
    userRoles,
    userPermissions,
    hasPermission,
    loading 
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const hasInventoryPermission = hasPermission(PERMISSIONS.INVENTORY_MANAGEMENT);
  const hasJobCardPermission = hasPermission(PERMISSIONS.JOB_CARD_MANAGEMENT);
  const hasInvoicePermission = hasPermission(PERMISSIONS.INVOICE_MANAGEMENT);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
              Welcome, {userData?.displayName || currentUser.displayName || 'User'}!
            </h1>
            {userCompany && (
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {userCompany.name}
              </p>
            )}
            {userRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200"
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Permission-based sections */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Job Card Management Section */}
            {hasJobCardPermission && (
              <Link
                href="/jobs/board"
                className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow transition-shadow hover:shadow-lg"
              >
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Job Cards
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  View and manage job cards
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                  <span className="text-sm font-medium">View Jobs →</span>
                </div>
              </Link>
            )}

            {/* Inventory Management Section */}
            {hasInventoryPermission && (
              <Link
                href="/inventory"
                className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow transition-shadow hover:shadow-lg"
              >
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Inventory
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Manage parts, suppliers, and purchase orders
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                  <span className="text-sm font-medium">Manage Inventory →</span>
                </div>
              </Link>
            )}

            {/* Invoice Management Section */}
            {hasInvoicePermission && (
              <Link
                href="/invoices"
                className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow transition-shadow hover:shadow-lg"
              >
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Invoices
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Create and manage invoices
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                  <span className="text-sm font-medium">View Invoices →</span>
                </div>
              </Link>
            )}

            {/* Quick Actions - shown if user has any permission */}
            {(hasInventoryPermission || hasJobCardPermission || hasInvoicePermission) && (
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Quick Actions
                </h2>
                <div className="mt-4 space-y-2">
                  {hasJobCardPermission && (
                    <Link
                      href="/jobs/create"
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create Job Card
                    </Link>
                  )}
                  {hasInvoicePermission && (
                    <Link
                      href="/invoices/create"
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create Invoice
                    </Link>
                  )}
                  {hasInventoryPermission && (
                    <Link
                      href="/inventory/purchase-orders"
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create Purchase Order
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Super Admin Section - Only super admin can see this */}
            {currentUser?.email === 'superadmin@gmail.com' && (
              <Link
                href="/admin/users"
                className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow transition-shadow hover:shadow-lg border-2 border-green-500"
              >
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  👑 User Management
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Manage users, roles, and permissions (Super Admin Only)
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                  <span className="text-sm font-medium">Manage Users →</span>
                </div>
              </Link>
            )}
          </div>

          {/* Permissions Info */}
          {userPermissions.length > 0 && (
            <div className="mt-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                Your Permissions
              </h2>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-800 dark:text-green-200"
                  >
                    {getPermissionDisplayName(permission)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No permissions message */}
          {userPermissions.length === 0 && (
            <div className="mt-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-6 shadow">
              <p className="text-yellow-800 dark:text-yellow-200">
                You don't have any permissions assigned. Please contact an administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
