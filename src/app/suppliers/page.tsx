'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSuppliersApi,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
} from '@/lib/apiClient';
import { Supplier, CreateSupplierData } from '@/lib/types';

export default function SuppliersPage() {
  const { currentUser, userData } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    mobile: '',
    gstin: '',
    address: '',
    companyId: '',
  });

  useEffect(() => {
    if (userData?.companyId) {
      loadSuppliers();
    }
  }, [userData?.companyId]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = allSuppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.mobile.includes(searchTerm) ||
          supplier.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuppliers(filtered);
    } else {
      setSuppliers(allSuppliers);
    }
  }, [searchTerm, allSuppliers]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      if (!userData?.companyId) {
        setError('Company not found');
        return;
      }
      const suppliersData = await getSuppliersApi(userData.companyId);
      // Transform API response to match Supplier type
      const transformedSuppliers = suppliersData.map((supplier: any) => ({
        id: supplier.id || supplier.supplierId,
        supplierId: supplier.supplierId || supplier.id,
        companyId: supplier.companyId || userData.companyId,
        name: supplier.name,
        mobile: supplier.mobile,
        gstin: supplier.gstin,
        address: supplier.address,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      }));
      setAllSuppliers(transformedSuppliers);
      setSuppliers(transformedSuppliers);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        return;
      }
      // Send exactly the fields required by the API
      const supplierData = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        address: formData.address.trim(),
        companyId: userData.companyId,
      };
      await createSupplierApi(supplierData);
      setSuccess('Supplier created successfully');
      setShowAddForm(false);
      resetForm();
      await loadSuppliers();
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      mobile: supplier.mobile,
      gstin: supplier.gstin,
      address: supplier.address,
      companyId: supplier.companyId,
    });
    setError('');
    setSuccess('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setError('');
    setSuccess('');

    try {
      const supplierId = editingSupplier.id || editingSupplier.supplierId;
      if (!supplierId) {
        setError('Supplier ID not found');
        return;
      }
      await updateSupplierApi(supplierId, formData);
      setSuccess('Supplier updated successfully');
      setEditingSupplier(null);
      resetForm();
      await loadSuppliers();
    } catch (err: any) {
      setError(err.message || 'Failed to update supplier');
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;

    try {
      const supplierId = deletingSupplier.id || deletingSupplier.supplierId;
      if (!supplierId) {
        setError('Supplier ID not found');
        return;
      }
      await deleteSupplierApi(supplierId);
      setSuccess('Supplier deleted successfully');
      setDeletingSupplier(null);
      await loadSuppliers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      gstin: '',
      address: '',
      companyId: '',
    });
  };

  if (loading && suppliers.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'INVENTORY_MANAGER']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading suppliers...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'INVENTORY_MANAGER']}>
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                  Suppliers Management
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Manage suppliers and their information
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    resetForm();
                    setError('');
                    setSuccess('');
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Add Supplier
                </button>
              </div>
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

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Name, Mobile, GSTIN, or Address"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingSupplier) && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <form onSubmit={editingSupplier ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Supplier Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        required
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="9876543210"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        GSTIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        required
                        maxLength={15}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="29ABCDE1234F1Z6"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="123 Main Street, Bangalore, Karnataka 560001"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingSupplier(null);
                        resetForm();
                      }}
                      className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Delete Confirmation */}
            {deletingSupplier && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Delete Supplier
                </h2>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong>{deletingSupplier.name}</strong>?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingSupplier(null)}
                    className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Suppliers List */}
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      GSTIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id || supplier.supplierId}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {supplier.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {supplier.mobile}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {supplier.gstin}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {supplier.address}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingSupplier(supplier)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {suppliers.length === 0 && (
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                  No suppliers found
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

