'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllUsers,
  createUserDocument,
  updateUserDisplayName,
  deleteUserDocument,
} from '@/lib/userService';
import { getAllCompanies, createCompany } from '@/lib/companyService';
import { getAllRoles, createRole } from '@/lib/roleService';
import { getAllPermissions, createPermission } from '@/lib/permissionService';
import { getRolesByUser } from '@/lib/userRoleService';
import { getPermissionsByRoles, getAllRolePermissions, createRolePermission, deleteRolePermission } from '@/lib/rolePermissionService';
import { setUserRoles } from '@/lib/userRoleService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserData, CreateUserData, Company, Role, Permission, PermissionType, RolePermission, UserRole } from '@/lib/types';
import { ROLE_DISPLAY_NAMES, USER_ROLES } from '@/lib/roles';
import { getPermissionDisplayName, PERMISSIONS } from '@/lib/permissions';
import { isSuperAdmin } from '@/lib/superAdminSetup';

export default function UsersManagementPage() {
  const { currentUser, userCompany, userPermissions, userRoles, isSuperAdmin: isUserSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'roles' | 'permissions' | 'role-permissions'>('companies');
  const [users, setUsers] = useState<UserData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, Role[]>>({});
  const [userPermissionsMap, setUserPermissionsMap] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  
  // Role management state
  const [showCreateRoleForm, setShowCreateRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState<UserRole>('MECHANIC');
  
  // Permission management state
  const [showCreatePermissionForm, setShowCreatePermissionForm] = useState(false);
  const [newPermissionName, setNewPermissionName] = useState<Permission>('INVENTORY_MANAGEMENT');
  
  // Role-Permission management state
  const [showCreateRolePermissionForm, setShowCreateRolePermissionForm] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>('');

  // Company management state
  const [showCreateCompanyForm, setShowCreateCompanyForm] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    stateCode: '',
  });

  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    displayName: '',
    companyId: userCompany?.id || '',
    roleIds: [],
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    roleIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, companiesData, rolesData, permissionsData, rolePermissionsData] = await Promise.all([
        getAllUsers(),
        getAllCompanies(),
        getAllRoles(),
        getAllPermissions(),
        getAllRolePermissions(),
      ]);
      
      setUsers(usersData);
      setCompanies(companiesData);
      setRoles(rolesData);
      setPermissions(permissionsData);
      setRolePermissions(rolePermissionsData);

      // Check if current user is the first user (only user in system)
      if (currentUser && usersData.length === 1 && usersData[0].id === currentUser.uid) {
        setIsFirstUser(true);
      } else {
        setIsFirstUser(false);
      }

      // Load roles and permissions for each user
      const rolesMap: Record<string, Role[]> = {};
      const permissionsMap: Record<string, Permission[]> = {};

      for (const user of usersData) {
        const userRoles = await getRolesByUser(user.id);
        rolesMap[user.id] = userRoles;
        
        if (userRoles.length > 0) {
          const roleIds = userRoles.map(r => r.id);
          const permissions = await getPermissionsByRoles(roleIds);
          permissionsMap[user.id] = permissions;
        } else {
          permissionsMap[user.id] = [];
        }
      }

      setUserRolesMap(rolesMap);
      setUserPermissionsMap(permissionsMap);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.companyId) {
      setError('Please select a company');
      return;
    }

    if (formData.roleIds.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create user document in Firestore
      await createUserDocument(
        userCredential.user.uid,
        formData.email,
        formData.displayName,
        formData.companyId,
        formData.roleIds
      );

      setSuccess('User created successfully');
      setShowCreateForm(false);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        companyId: userCompany?.id || '',
        roleIds: [],
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEdit = async (user: UserData) => {
    setEditingUser(user);
    const userRoles = await getRolesByUser(user.id);
    setEditFormData({
      displayName: user.displayName,
      roleIds: userRoles.map(r => r.id),
    });
    setError('');
    setSuccess('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');

    try {
      // Update display name if changed
      if (editFormData.displayName !== editingUser.displayName) {
        await updateUserDisplayName(editingUser.id, editFormData.displayName);
      }

      // Update roles
      await setUserRoles(editingUser.id, editFormData.roleIds);

      setSuccess('User updated successfully');
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setError('');
    setSuccess('');

    try {
      await deleteUserDocument(deletingUser.id);
      setSuccess('User deleted successfully');
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const toggleRole = (roleId: string, isCreate: boolean) => {
    if (isCreate) {
      setFormData({
        ...formData,
        roleIds: formData.roleIds.includes(roleId)
          ? formData.roleIds.filter(id => id !== roleId)
          : [...formData.roleIds, roleId],
      });
    } else {
      setEditFormData({
        ...editFormData,
        roleIds: editFormData.roleIds.includes(roleId)
          ? editFormData.roleIds.filter(id => id !== roleId)
          : [...editFormData.roleIds, roleId],
      });
    }
  };

  // Role management handlers
  const handleCreateRole = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await createRole(newRoleName);
      setSuccess('Role created successfully');
      setShowCreateRoleForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  };

  // Permission management handlers
  const handleCreatePermission = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await createPermission(newPermissionName);
      setSuccess('Permission created successfully');
      setShowCreatePermissionForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create permission');
    }
  };

  // Role-Permission management handlers
  const handleCreateRolePermission = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!selectedRoleId || !selectedPermissionId) {
      setError('Please select both role and permission');
      return;
    }
    
    try {
      await createRolePermission(selectedRoleId, selectedPermissionId);
      setSuccess('Role-permission mapping created successfully');
      setShowCreateRolePermissionForm(false);
      setSelectedRoleId('');
      setSelectedPermissionId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role-permission mapping');
    }
  };

  const handleDeleteRolePermission = async (rolePermissionId: string) => {
    if (!confirm('Are you sure you want to delete this role-permission mapping?')) {
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      await deleteRolePermission(rolePermissionId);
      setSuccess('Role-permission mapping deleted successfully');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role-permission mapping');
    }
  };

  if (loading && users.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading users...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Only super admin can access this page
  const userIsSuperAdmin = isSuperAdmin(currentUser?.email || null);

  if (!userIsSuperAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                Access Denied
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Only super admin (superadmin@gmail.com) can access the User Management dashboard.
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                    Admin Management
                    {isUserSuperAdmin && (
                      <span className="ml-3 text-lg font-normal text-green-600 dark:text-green-400">
                        👑 Super Admin
                      </span>
                    )}
                  </h1>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Complete setup flow: Company → Roles → Permissions → Role-Permissions → Users
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Complete Setup Flow:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <li><strong>Companies Tab:</strong> Create a company first</li>
                  <li><strong>Roles Tab:</strong> Create roles (ADMIN, ACCOUNTANT, MECHANIC, SERVICE_ADVISOR, INVENTORY_MANAGER)</li>
                  <li><strong>Permissions Tab:</strong> Create permissions (INVENTORY_MANAGEMENT, JOB_CARD_MANAGEMENT, INVOICE_MANAGEMENT)</li>
                  <li><strong>Role-Permissions Tab:</strong> Attach permissions to roles (e.g., ADMIN → all permissions, ACCOUNTANT → INVOICE_MANAGEMENT)</li>
                  <li><strong>Users Tab:</strong> Create users, assign them to a company, and assign roles. Users automatically get permissions via role_permission mappings!</li>
                </ol>
                <p className="mt-3 text-xs text-blue-700 dark:text-blue-400 italic">
                  💡 Tip: When you assign a role to a user, they automatically receive all permissions associated with that role through the role_permission table.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
              <nav className="-mb-px flex space-x-8">
                {(['companies', 'users', 'roles', 'permissions', 'role-permissions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'companies' && 'Companies'}
                    {tab === 'users' && 'Users'}
                    {tab === 'roles' && 'Roles'}
                    {tab === 'permissions' && 'Permissions'}
                    {tab === 'role-permissions' && 'Role-Permissions'}
                  </button>
                ))}
              </nav>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Super Admin Notice */}
            {isUserSuperAdmin && (
              <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  👑 Super Admin Access
                </h3>
                <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                  You are logged in as <strong>Super Admin</strong> (superadmin@gmail.com). You have full access to all operations.
                </p>
                <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                  <strong>Super Admin Privileges:</strong>
                </p>
                <ul className="text-sm text-green-800 dark:text-green-300 list-disc list-inside space-y-1 mb-2">
                  <li>✅ Create companies (Only super admin can create companies)</li>
                  <li>✅ Create roles (ADMIN, ACCOUNTANT, MECHANIC, SERVICE_ADVISOR, INVENTORY_MANAGER)</li>
                  <li>✅ Create permissions (All system permissions)</li>
                  <li>✅ Map permissions to roles</li>
                  <li>✅ Create users and assign roles</li>
                  <li>✅ Manage all users, roles, and permissions</li>
                </ul>
              </div>
            )}

            {/* Initial Setup Notice for non-super admin */}
            {!isUserSuperAdmin && ((userPermissions && userPermissions.length === 0) && (userRoles && userRoles.length === 0)) && (
              <div className="mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  🚀 Initial Setup Mode
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  You're accessing the admin dashboard in Initial Setup Mode because you don't have any permissions assigned yet.
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Contact super admin (superadmin@gmail.com) to assign roles and permissions to your account.
                </p>
              </div>
            )}

            {/* Companies Tab - Step 1: Create Company */}
            {activeTab === 'companies' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Setup Flow:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
                    <li>Create Company (this tab)</li>
                    <li>Create Roles (Roles tab)</li>
                    <li>Create Permissions (Permissions tab)</li>
                    <li>Attach Permissions to Roles (Role-Permissions tab)</li>
                    <li>Create Users and assign Roles (Users tab)</li>
                  </ol>
                </div>

                {isUserSuperAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowCreateCompanyForm(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Create Company
                    </button>
                  </div>
                )}
                {!isUserSuperAdmin && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Access Restricted:</strong> Only super admin (superadmin@gmail.com) can create companies.
                    </p>
                  </div>
                )}

                {showCreateCompanyForm && isUserSuperAdmin && (
                  <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                      Create New Company
                    </h2>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setError('');
                      setSuccess('');
                      
                      try {
                        await createCompany(companyFormData);
                        setSuccess('Company created successfully');
                        setShowCreateCompanyForm(false);
                        setCompanyFormData({
                          name: '',
                          gstin: '',
                          address: '',
                          phone: '',
                          email: '',
                          stateCode: '',
                        });
                        await loadData();
                      } catch (err: any) {
                        setError(err.message || 'Failed to create company');
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={companyFormData.name}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          GSTIN *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={companyFormData.gstin}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, gstin: e.target.value.toUpperCase() })}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="15 alphanumeric characters"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Address *
                        </label>
                        <textarea
                          required
                          value={companyFormData.address}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            value={companyFormData.phone}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={companyFormData.email}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          State Code *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={companyFormData.stateCode}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, stateCode: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g., 09"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Create Company
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateCompanyForm(false);
                            setCompanyFormData({
                              name: '',
                              gstin: '',
                              address: '',
                              phone: '',
                              email: '',
                              stateCode: '',
                            });
                          }}
                          className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Company Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          GSTIN
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {company.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {company.gstin}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {company.email}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {company.phone}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {company.createdAt.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {companies.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                      No companies found. Create your first company to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab - Step 5: Create Users and Assign Roles */}
            {activeTab === 'users' && (
              <>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">User Creation Flow:</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    After creating a company, roles, permissions, and role-permission mappings, you can now create users.
                    When you assign roles to a user, they automatically get all permissions associated with those roles via the role_permission table.
                  </p>
                </div>

                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateForm(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Create User
                  </button>
                </div>

                {/* Create User Form */}
            {showCreateForm && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Create New User
                </h2>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Company
                    </label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) =>
                        setFormData({ ...formData, companyId: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Roles (select multiple)
                    </label>
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.roleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id, true)}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {ROLE_DISPLAY_NAMES[role.name]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setFormData({
                          email: '',
                          password: '',
                          displayName: '',
                          companyId: userCompany?.id || '',
                          roleIds: [],
                        });
                      }}
                      className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Edit User: {editingUser.email}
                </h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.displayName}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          displayName: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Roles (select multiple)
                    </label>
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editFormData.roleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id, false)}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {ROLE_DISPLAY_NAMES[role.name]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Update User
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Delete User
                </h2>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete{' '}
                  <strong>{deletingUser.displayName}</strong> ({deletingUser.email})? This action
                  cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingUser(null)}
                    className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {users.map((user) => {
                    const userRoles = userRolesMap[user.id] || [];
                    const userPermissions = userPermissionsMap[user.id] || [];
                    const userCompany = companies.find(c => c.id === user.companyId);

                    return (
                      <tr key={user.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {user.displayName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {userCompany?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {userRoles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200"
                              >
                                {ROLE_DISPLAY_NAMES[role.name]}
                              </span>
                            ))}
                            {userRoles.length === 0 && (
                              <span className="text-zinc-400 text-xs">No roles</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {userPermissions.map((permission) => (
                              <span
                                key={permission}
                                className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-200"
                              >
                                {getPermissionDisplayName(permission)}
                              </span>
                            ))}
                            {userPermissions.length === 0 && (
                              <span className="text-zinc-400 text-xs">No permissions</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(user)}
                            className="mr-3 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          {user.id !== currentUser?.uid && (
                            <button
                              onClick={() => {
                                setDeletingUser(user);
                                setError('');
                                setSuccess('');
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                  No users found
                </div>
              )}
            </div>
              </>
            )}

            {/* Roles Tab - Step 2: Create Roles */}
            {activeTab === 'roles' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Role Creation:</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Create roles (ADMIN, ACCOUNTANT, MECHANIC, SERVICE_ADVISOR, INVENTORY_MANAGER).
                    After creating roles, go to the Role-Permissions tab to assign permissions to these roles.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateRoleForm(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Create Role
                  </button>
                </div>

                {showCreateRoleForm && (
                  <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                      Create New Role
                    </h2>
                    <form onSubmit={handleCreateRole} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Role Name
                        </label>
                        <select
                          required
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value as UserRole)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_DISPLAY_NAMES[role]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Create Role
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateRoleForm(false)}
                          className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Role Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {roles.map((role) => (
                        <tr key={role.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                              {ROLE_DISPLAY_NAMES[role.name]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {role.createdAt.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Permissions Tab - Step 3: Create Permissions */}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Permission Creation:</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Create permissions (INVENTORY_MANAGEMENT, JOB_CARD_MANAGEMENT, INVOICE_MANAGEMENT).
                    After creating permissions, go to the Role-Permissions tab to attach these permissions to roles.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreatePermissionForm(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Create Permission
                  </button>
                </div>

                {showCreatePermissionForm && (
                  <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                      Create New Permission
                    </h2>
                    <form onSubmit={handleCreatePermission} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Permission Name
                        </label>
                        <select
                          required
                          value={newPermissionName}
                          onChange={(e) => setNewPermissionName(e.target.value as Permission)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.values(PERMISSIONS).map((perm) => (
                            <option key={perm} value={perm}>
                              {getPermissionDisplayName(perm)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Create Permission
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreatePermissionForm(false)}
                          className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Permission Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {permissions.map((permission) => (
                        <tr key={permission.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-200">
                              {getPermissionDisplayName(permission.name)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {permission.createdAt.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Role-Permissions Tab - Step 4: Attach Permissions to Roles */}
            {activeTab === 'role-permissions' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Role-Permission Mapping:</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                    Attach permissions to roles. When you assign a role to a user, they automatically get all permissions associated with that role.
                  </p>
                  <div className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    <strong>Example:</strong> Attach INVENTORY_MANAGEMENT permission to INVENTORY_MANAGER role.
                    Then when you assign INVENTORY_MANAGER role to a user, they get INVENTORY_MANAGEMENT permission automatically.
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateRolePermissionForm(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Create Role-Permission Mapping
                  </button>
                </div>

                {showCreateRolePermissionForm && (
                  <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                      Create Role-Permission Mapping
                    </h2>
                    <form onSubmit={handleCreateRolePermission} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Role
                        </label>
                        <select
                          required
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select a role</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {ROLE_DISPLAY_NAMES[role.name]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Permission
                        </label>
                        <select
                          required
                          value={selectedPermissionId}
                          onChange={(e) => setSelectedPermissionId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select a permission</option>
                          {permissions.map((permission) => (
                            <option key={permission.id} value={permission.id}>
                              {getPermissionDisplayName(permission.name)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Create Mapping
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateRolePermissionForm(false);
                            setSelectedRoleId('');
                            setSelectedPermissionId('');
                          }}
                          className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Permission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {rolePermissions.map((rp) => {
                        const role = roles.find(r => r.id === rp.roleId);
                        const permission = permissions.find(p => p.id === rp.permissionId);
                        return (
                          <tr key={rp.id}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              {role ? (
                                <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                                  {ROLE_DISPLAY_NAMES[role.name]}
                                </span>
                              ) : (
                                <span className="text-zinc-400">Unknown</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              {permission ? (
                                <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-200">
                                  {getPermissionDisplayName(permission.name)}
                                </span>
                              ) : (
                                <span className="text-zinc-400">Unknown</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                              {rp.createdAt.toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteRolePermission(rp.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {rolePermissions.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                      No role-permission mappings found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
