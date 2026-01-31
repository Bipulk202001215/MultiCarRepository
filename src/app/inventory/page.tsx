'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllParts,
  createPart,
  updatePart,
  deletePart,
  searchParts,
  getLowStockParts,
  getAllSuppliers,
} from '@/lib/inventoryService';
import { Part, CreatePartData, PartCategory, GSTSlab, Supplier } from '@/lib/types';
import { BarcodeScanner } from '@/components/BarcodeScanner';

const PART_CATEGORIES: PartCategory[] = ['OEM', 'OES', 'Local'];
const GST_SLABS: GSTSlab[] = [5, 18, 28];

function getStockStatus(stockQty: number, minStock: number): { label: string; color: string } {
  if (stockQty <= minStock) {
    return { label: 'Low Stock', color: 'text-red-600 dark:text-red-400' };
  }
  return { label: 'In Stock', color: 'text-green-600 dark:text-green-400' };
}

export default function InventoryPage() {
  const { currentUser, userData } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPart, setScannedPart] = useState<Part | null>(null);

  // Add New Part: part code search dropdown (same as main search: prefix*last3, 1st/2nd value)
  const [filteredPartSuggestions, setFilteredPartSuggestions] = useState<Part[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [partSelectedFromDropdown, setPartSelectedFromDropdown] = useState(false);
  const partDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePartData>({
    partCode: '',
    name: '',
    category: 'OEM',
    hsnCode: '',
    gstSlab: 5,
    stockQty: 0,
    minStock: 0,
    unitPrice: 0,
    supplierId: '',
    barcode: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (userData?.companyId) {
      loadData();
    }
  }, [userData?.companyId]);

  useEffect(() => {
    if (searchTerm.trim() && userData?.companyId) {
      handleSearch(searchTerm);
    } else if (userData?.companyId) {
      loadParts();
    }
  }, [searchTerm, userData?.companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!userData?.companyId) {
        setError('Company not found');
        return;
      }
      const [partsData, suppliersData] = await Promise.all([
        getAllParts(userData.companyId),
        getAllSuppliers(userData.companyId),
      ]);
      setParts(partsData);
      setSuppliers(suppliersData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadParts = async () => {
    try {
      if (!userData?.companyId) return;
      const partsData = await getAllParts(userData.companyId);
      setParts(partsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load parts');
    }
  };

  const handleSearch = async (term: string) => {
    try {
      if (!userData?.companyId) return;
      const results = await searchParts(term, userData.companyId);
      setParts(results);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    }
  };

  // Part code input in Add New Part: same search (prefix*last3, part code/name/barcode)
  const handlePartCodeChange = async (value: string) => {
    setFormData({ ...formData, partCode: value });
    setPartSelectedFromDropdown(false);
    if (value.trim() === '') {
      setFilteredPartSuggestions([]);
      setShowPartDropdown(false);
      return;
    }
    if (!userData?.companyId) return;
    try {
      const results = await searchParts(value.trim(), userData.companyId);
      setFilteredPartSuggestions(results.slice(0, 50));
      setShowPartDropdown(results.length > 0);
    } catch {
      setFilteredPartSuggestions([]);
      setShowPartDropdown(false);
    }
  };

  const handlePartSelect = (part: Part) => {
    setFormData({ ...formData, partCode: part.partCode, name: part.name });
    setPartSelectedFromDropdown(true);
    setShowPartDropdown(false);
    setFilteredPartSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partDropdownRef.current && !partDropdownRef.current.contains(event.target as Node)) {
        setShowPartDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      if (!userData?.companyId) return;
      const results = await searchParts(barcode, userData.companyId);
      if (results.length > 0) {
        setScannedPart(results[0]);
        setParts(results);
        setSearchTerm(barcode);
        setShowScanner(false);
      } else {
        setError(`No part found with barcode: ${barcode}`);
        setShowScanner(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search part by barcode');
      setShowScanner(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Part name is required');
      return;
    }
    if (!formData.hsnCode.trim()) {
      setError('HSN Code is required');
      return;
    }

    try {
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        return;
      }
      await createPart(formData, userData.companyId);
      setSuccess('Part created successfully');
      setShowAddForm(false);
      resetForm();
      await loadParts();
    } catch (err: any) {
      setError(err.message || 'Failed to create part');
    }
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      partCode: part.partCode,
      name: part.name,
      category: part.category,
      hsnCode: part.hsnCode,
      gstSlab: part.gstSlab,
      stockQty: part.stockQty,
      minStock: part.minStock,
      unitPrice: part.unitPrice,
      supplierId: part.supplierId || '',
      barcode: part.barcode || '',
    });
    setError('');
    setSuccess('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Part name is required');
      return;
    }
    if (!formData.hsnCode.trim()) {
      setError('HSN Code is required');
      return;
    }

    try {
      await updatePart(editingPart.id, formData);
      setSuccess('Part updated successfully');
      setEditingPart(null);
      resetForm();
      await loadParts();
    } catch (err: any) {
      setError(err.message || 'Failed to update part');
    }
  };

  const handleDelete = async () => {
    if (!deletingPart) return;

    try {
      await deletePart(deletingPart.id);
      setSuccess('Part deleted successfully');
      setDeletingPart(null);
      await loadParts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete part');
    }
  };

  const resetForm = () => {
    setFormData({
      partCode: '',
      name: '',
      category: 'OEM',
      hsnCode: '',
      gstSlab: 5,
      stockQty: 0,
      minStock: 0,
      unitPrice: 0,
      supplierId: '',
      barcode: '',
    });
    setPartSelectedFromDropdown(false);
  };

  if (loading && parts.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'INVENTORY_MANAGER']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading inventory...</p>
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
                  Inventory Management
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Manage parts, stock levels, and suppliers
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  resetForm();
                  setError('');
                  setSuccess('');
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Add Part
              </button>
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
            <div className="mb-6 flex gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Part Code, Name, or Barcode"
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  setShowScanner(true);
                  setError('');
                  setSuccess('');
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Scan Barcode
              </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingPart) && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  {editingPart ? 'Edit Part' : 'Add New Part'}
                </h2>
                <form onSubmit={editingPart ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="relative" ref={partDropdownRef}>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Part Code {!editingPart && <span className="text-zinc-500"></span>}
                      </label>
                      <input
                        type="text"
                        value={formData.partCode}
                        onChange={(e) => handlePartCodeChange(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Part code, prefix*last3 (e.g. 26*341), or leave empty"
                        disabled={!!editingPart}
                        onFocus={() => {
                          if (formData.partCode.trim() && filteredPartSuggestions.length > 0) setShowPartDropdown(true);
                        }}
                      />
                      {showPartDropdown && filteredPartSuggestions.length > 0 && !editingPart && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg">
                          {filteredPartSuggestions.map((part) => (
                            <div
                              key={part.id}
                              onClick={() => handlePartSelect(part)}
                              className="cursor-pointer px-4 py-2 hover:bg-blue-50 dark:hover:bg-zinc-700 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
                            >
                              <div className="font-medium text-black dark:text-zinc-50">{part.partCode}</div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">{part.name || '—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={partSelectedFromDropdown && !editingPart}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as PartCategory })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {PART_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        HSN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.hsnCode}
                        onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        GST Slab <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.gstSlab}
                        onChange={(e) => setFormData({ ...formData, gstSlab: parseInt(e.target.value) as GSTSlab })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {GST_SLABS.map((slab) => (
                          <option key={slab} value={slab}>
                            {slab}%
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Stock Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQty}
                        onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Min Stock (Reorder Alert)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Supplier
                      </label>
                      <select
                        value={formData.supplierId}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value || undefined })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value || undefined })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {editingPart ? 'Update Part' : 'Create Part'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingPart(null);
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
            {deletingPart && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Delete Part
                </h2>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong>{deletingPart.name}</strong> ({deletingPart.partCode})?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingPart(null)}
                    className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Barcode Scanner */}
            {showScanner && (
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onError={(err) => {
                  setError(err);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}

            {/* Scanned Part Info */}
            {scannedPart && (
              <div className="mb-4 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Found part: <strong>{scannedPart.name}</strong> ({scannedPart.partCode}) - Stock: {scannedPart.stockQty}
                </p>
                <button
                  onClick={() => setScannedPart(null)}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Parts List */}
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Min Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      HSN Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      GST
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {parts.map((part) => {
                    const status = getStockStatus(part.stockQty, part.minStock);
                    return (
                      <tr key={part.id} className={part.stockQty <= part.minStock ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {part.partCode}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.stockQty}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.minStock}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className={status.color}>{status.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.hsnCode}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.gstSlab}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          ₹{part.unitPrice.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(part)}
                            className="mr-3 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingPart(part)}
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
              {parts.length === 0 && (
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                  No parts found
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


