import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { PERMISSIONS, getPermissionDisplayName } from "@/lib/permissions";

export default function HomePage() {
  const { 
    currentUser, 
    userData, 
    userCompany,
    userRoles,
    userPermissions,
    hasPermission,
    loading 
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);

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
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
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
                    className="inline-flex rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-md"
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hasJobCardPermission && (
              <Link
                to="/jobs/board"
                className="rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 shadow-xl border border-white/20 dark:border-zinc-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] transform"
              >
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Job Cards
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  View and manage job cards
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="text-sm">View Jobs →</span>
                </div>
              </Link>
            )}

            {hasInventoryPermission && (
              <Link
                to="/inventory"
                className="rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 shadow-xl border border-white/20 dark:border-zinc-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] transform"
              >
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Inventory
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  Manage parts, suppliers, and purchase orders
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="text-sm">Manage Inventory →</span>
                </div>
              </Link>
            )}

            {hasInvoicePermission && (
              <Link
                to="/invoices"
                className="rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 shadow-xl border border-white/20 dark:border-zinc-700/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] transform"
              >
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Invoices
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  Create and manage invoices
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="text-sm">View Invoices →</span>
                </div>
              </Link>
            )}

            {(hasInventoryPermission || hasJobCardPermission || hasInvoicePermission) && (
              <div className="rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 shadow-xl border border-white/20 dark:border-zinc-700/50">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Quick Actions
                </h2>
                <div className="mt-4 space-y-2">
                  {hasJobCardPermission && (
                    <Link
                      to="/jobs/create"
                      className="block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Create Job Card →
                    </Link>
                  )}
                  {hasInvoicePermission && (
                    <Link
                      to="/invoices"
                      className="block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Manage Invoices →
                    </Link>
                  )}
                  {hasInventoryPermission && (
                    <Link
                      to="/inventory/purchase-orders"
                      className="block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Create Purchase Order →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {currentUser?.email === 'superadmin@gmail.com' && (
              <Link
                to="/admin/users"
                className="rounded-2xl backdrop-blur-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900/90 dark:to-zinc-800/90 p-6 shadow-xl border-2 border-blue-400 dark:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] transform"
              >
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  👑 User Management
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  Manage users, roles, and permissions (Super Admin Only)
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="text-sm">Manage Users →</span>
                </div>
              </Link>
            )}
          </div>

          {userPermissions.length > 0 && (
            <div className="mt-8 rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 shadow-xl border border-white/20 dark:border-zinc-700/50">
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
                Your Permissions
              </h2>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-md"
                  >
                    {getPermissionDisplayName(permission)}
                  </span>
                ))}
              </div>
            </div>
          )}

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

