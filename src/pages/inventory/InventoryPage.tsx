import { useState, useEffect, FormEvent, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllParts,
  createPart,
  updatePart,
  deletePart,
  searchParts,
  getLowStockParts,
  getAlertedParts,
  searchPartByCode,
} from '@/lib/inventoryService';
import { getSuppliersApi } from '@/lib/apiClient';
import { Part, CreatePartData, PartCategory, GSTSlab, Supplier } from '@/lib/types';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import partData from '@/partData.json';

interface PartDataItem {
  PART_No: string;
  PART_DESC: string;
  Company: string;
}

const PART_CATEGORIES: PartCategory[] = ['OEM', 'OES', 'Local'];
const GST_SLABS: GSTSlab[] = [5, 18, 28];

function getStockStatus(stockQty: number, minStock: number): { label: string; color: string } {
  if (stockQty <= minStock) {
    return { label: 'Low Stock', color: 'text-red-600 dark:text-red-400' };
  }
  return { label: 'In Stock', color: 'text-green-600 dark:text-green-400' };
}

export default function InventoryPage() {
  const { currentUser, userData, userCompany } = useAuth();
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
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [allParts, setAllParts] = useState<Part[]>([]);
  
  // Autocomplete state
  const [filteredPartData, setFilteredPartData] = useState<PartDataItem[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const partDropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle part code input change and filter data
  const handlePartCodeChange = (value: string) => {
    setFormData({ ...formData, partCode: value });
    
    if (value.trim() === '') {
      setFilteredPartData([]);
      setShowPartDropdown(false);
      return;
    }
    
    // Filter part data that starts with the entered value
    const filtered = (partData as PartDataItem[]).filter((item) =>
      item.PART_No.startsWith(value)
    );
    
    setFilteredPartData(filtered.slice(0, 50)); // Limit to 50 results for performance
    setShowPartDropdown(filtered.length > 0);
  };
  
  // Handle part selection from dropdown
  const handlePartSelect = (part: PartDataItem) => {
    setFormData({
      ...formData,
      partCode: part.PART_No,
      name: part.PART_DESC,
    });
    setSelectedCompanyName(part.Company);
    setShowPartDropdown(false);
    setFilteredPartData([]);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partDropdownRef.current && !partDropdownRef.current.contains(event.target as Node)) {
        setShowPartDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        getSuppliersApi(userData.companyId),
      ]);
      // Sort parts: alerted items first
      const sortedParts = [...partsData].sort((a, b) => {
        const aIsAlerted = a.stockQty <= a.minStock;
        const bIsAlerted = b.stockQty <= b.minStock;
        if (aIsAlerted && !bIsAlerted) return -1;
        if (!aIsAlerted && bIsAlerted) return 1;
        return 0;
      });
      setAllParts(sortedParts);
      setParts(sortedParts);
      // Transform API response to match Supplier type
      const transformedSuppliers = suppliersData.map((supplier: any) => ({
        id: supplier.id || supplier.supplierId,
        supplierId: supplier.supplierId || supplier.id,
        companyId: supplier.companyId || userData.companyId,
        name: supplier.name,
        mobile: supplier.mobile || supplier.contact || '',
        gstin: supplier.gstin,
        address: supplier.address || '',
        contact: supplier.contact || supplier.mobile,
        email: supplier.email,
        createdAt: supplier.createdAt ? new Date(supplier.createdAt) : new Date(),
        updatedAt: supplier.updatedAt ? new Date(supplier.updatedAt) : new Date(),
      }));
      setSuppliers(transformedSuppliers);
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
      // Sort parts: alerted items first
      const sortedParts = [...partsData].sort((a, b) => {
        const aIsAlerted = a.stockQty <= a.minStock;
        const bIsAlerted = b.stockQty <= b.minStock;
        if (aIsAlerted && !bIsAlerted) return -1;
        if (!aIsAlerted && bIsAlerted) return 1;
        return 0;
      });
      setAllParts(sortedParts);
      if (showLowStockOnly) {
        setParts(sortedParts.filter((part) => part.stockQty <= part.minStock));
      } else {
        setParts(sortedParts);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load parts');
    }
  };

  const handleShowAll = async () => {
    try {
      if (!userData?.companyId) return;
      const partsData = await getAllParts(userData.companyId);
      // Sort parts: alerted items first
      const sortedParts = [...partsData].sort((a, b) => {
        const aIsAlerted = a.stockQty <= a.minStock;
        const bIsAlerted = b.stockQty <= b.minStock;
        if (aIsAlerted && !bIsAlerted) return -1;
        if (!aIsAlerted && bIsAlerted) return 1;
        return 0;
      });
      setAllParts(sortedParts);
      setParts(sortedParts);
      setShowLowStockOnly(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load parts');
    }
  };

  const handleAlertStock = async () => {
    try {
      if (!userData?.companyId) return;
      setLoading(true);
      const alertedParts = await getAlertedParts(userData.companyId);
      // Parts from alerts API are already alerted, but ensure they're sorted
      const sortedParts = [...alertedParts].sort((a, b) => {
        const aIsAlerted = a.stockQty <= a.minStock;
        const bIsAlerted = b.stockQty <= b.minStock;
        if (aIsAlerted && !bIsAlerted) return -1;
        if (!aIsAlerted && bIsAlerted) return 1;
        return 0;
      });
      setParts(sortedParts);
      setShowLowStockOnly(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load alerted parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    try {
      if (!userData?.companyId) return;
      const results = await searchParts(term, userData.companyId);
      // Sort results: alerted items first
      const sortedResults = [...results].sort((a, b) => {
        const aIsAlerted = a.stockQty <= a.minStock;
        const bIsAlerted = b.stockQty <= b.minStock;
        if (aIsAlerted && !bIsAlerted) return -1;
        if (!aIsAlerted && bIsAlerted) return 1;
        return 0;
      });
      if (showLowStockOnly) {
        // Filter search results to show only low stock items
        setParts(sortedResults.filter((part) => part.stockQty <= part.minStock));
      } else {
        setParts(sortedResults);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      if (!userData?.companyId) return;
      const part = await searchPartByCode(barcode.trim(), userData.companyId);
      if (part) {
        setScannedPart(part);
        setParts([part]);
        setSearchTerm(barcode);
        setShowScanner(false);
      } else {
        setError(`No part found with part code: ${barcode}`);
        setShowScanner(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search part by code');
      setShowScanner(false);
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
      // Get company name from selectedCompanyName or fallback to userCompany name
      const companyName = selectedCompanyName || userCompany?.name || '';
      await createPart(formData, userData.companyId, companyName);
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
    setSelectedCompanyName('');
    setFilteredPartData([]);
    setShowPartDropdown(false);
  };

  if (loading && parts.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading inventory...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
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
              <div className="flex gap-3">
                <button
                  onClick={handleShowAll}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Show All
                </button>
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
                <button
                  onClick={handleAlertStock}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
                >
                  Alert Stock
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
                  {/* First Row: Part Code, Part Description, Company Name */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="relative" ref={partDropdownRef}>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Part Code {!editingPart && <span className="text-zinc-500">(Auto-generated if empty)</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.partCode}
                        onChange={(e) => handlePartCodeChange(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Start typing part number (e.g., 9)"
                        disabled={!!editingPart}
                        onFocus={() => {
                          if (formData.partCode && formData.partCode.trim() !== '' && filteredPartData.length > 0) {
                            setShowPartDropdown(true);
                          }
                        }}
                      />
                      {showPartDropdown && filteredPartData.length > 0 && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg">
                          {filteredPartData.map((part, index) => (
                            <div
                              key={index}
                              onClick={() => handlePartSelect(part)}
                              className="cursor-pointer px-4 py-2 hover:bg-blue-50 dark:hover:bg-zinc-700 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
                            >
                              <div className="font-medium text-black dark:text-zinc-50">{part.PART_No}</div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">{part.PART_DESC}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-500">Company: {part.Company}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Part Description
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter part description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={selectedCompanyName || userCompany?.name || userData?.companyId || ''}
                        onChange={(e) => setSelectedCompanyName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  {/* Second Row: Units, Min Stock Alert, Unit Price */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Units
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQty === 0 ? '' : formData.stockQty}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, stockQty: value === '' ? 0 : parseInt(value) || 0 });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setFormData({ ...formData, stockQty: 0 });
                          }
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Min Stock Alert
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minStock === 0 ? '' : formData.minStock}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, minStock: value === '' ? 0 : parseInt(value) || 0 });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setFormData({ ...formData, minStock: 0 });
                          }
                        }}
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
                        value={formData.unitPrice === 0 ? '' : formData.unitPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, unitPrice: value === '' ? 0 : parseFloat(value) || 0 });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setFormData({ ...formData, unitPrice: 0 });
                          }
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Third Row: Supplier */}
                  <div className="grid gap-4 md:grid-cols-1">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Supplier
                      </label>
                      <select
                        value={formData.supplierId || ''}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a supplier...</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} {supplier.mobile ? `- ${supplier.mobile}` : ''}
                          </option>
                        ))}
                      </select>
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
                      Part Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Min Stock Alert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Created On
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {[...parts].sort((a, b) => {
                    // Sort: alerted items (stockQty <= minStock) first
                    const aIsAlerted = a.stockQty <= a.minStock;
                    const bIsAlerted = b.stockQty <= b.minStock;
                    if (aIsAlerted && !bIsAlerted) return -1;
                    if (!aIsAlerted && bIsAlerted) return 1;
                    return 0;
                  }).map((part) => {
                    const isAlerted = part.stockQty <= part.minStock;
                    return (
                      <tr key={part.id} className={isAlerted ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          <div className="flex items-center gap-2">
                            {isAlerted && (
                              <svg
                                className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <span>{part.partCode}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.stockQty}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.minStock}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          ₹{part.unitPrice.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {part.createdAt ? new Date(part.createdAt).toLocaleDateString() : '-'}
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
  );
}
