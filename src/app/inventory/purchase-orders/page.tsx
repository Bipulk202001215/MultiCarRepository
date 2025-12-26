'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderItems,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
  calculatePOTotals,
} from '@/lib/purchaseOrderService';
import { getAllSuppliers } from '@/lib/inventoryService';
import { getAllParts, getPart } from '@/lib/inventoryService';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, CreatePurchaseOrderData } from '@/lib/types';
import { Supplier, Part } from '@/lib/types';

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  PENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  ORDERED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

export default function PurchaseOrdersPage() {
  const { currentUser, userData } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    supplierId: string;
    orderDate: string;
    expectedDate: string;
    items: PurchaseOrderItem[];
    status: PurchaseOrderStatus;
  }>({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    items: [],
    status: 'DRAFT',
  });

  useEffect(() => {
    if (userData?.companyId) {
      loadData();
    }
  }, [userData?.companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!userData?.companyId) {
        setError('Company not found');
        return;
      }
      const [posData, suppliersData, partsData] = await Promise.all([
        getAllPurchaseOrders(userData.companyId),
        getAllSuppliers(userData.companyId),
        getAllParts(userData.companyId),
      ]);
      setPurchaseOrders(posData);
      setSuppliers(suppliersData);
      setParts(partsData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          partId: '',
          partCode: '',
          name: '',
          quantity: 1,
          unitPrice: 0,
          gstSlab: 5,
          total: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totals = calculatePOTotals(newItems);
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  const handleItemChange = async (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...formData.items];
    
    if (field === 'partId' && value) {
      // Fetch part details and auto-fill
      try {
        const part = await getPart(value);
        if (part) {
          newItems[index] = {
            ...newItems[index],
            partId: part.id,
            partCode: part.partCode,
            name: part.name,
            unitPrice: part.unitPrice,
            gstSlab: part.gstSlab,
            quantity: newItems[index].quantity || 1,
          };
          // Recalculate total
          const itemSubTotal = newItems[index].quantity * newItems[index].unitPrice;
          const itemGst = itemSubTotal * (newItems[index].gstSlab / 100);
          newItems[index].total = itemSubTotal + itemGst;
        }
      } catch (err) {
        console.error('Failed to fetch part:', err);
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      
      // Recalculate total when quantity, unitPrice, or gstSlab changes
      if (field === 'quantity' || field === 'unitPrice' || field === 'gstSlab') {
        const itemSubTotal = newItems[index].quantity * newItems[index].unitPrice;
        const itemGst = itemSubTotal * (newItems[index].gstSlab / 100);
        newItems[index].total = itemSubTotal + itemGst;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    if (formData.items.some(item => !item.partId || item.quantity <= 0)) {
      setError('Please fill in all item details correctly');
      return;
    }

    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }
      
      if (!userData?.companyId) {
        setError('Company not found');
        return;
      }
      await createPurchaseOrder(
        {
          supplierId: formData.supplierId,
          items: formData.items,
          orderDate: new Date(formData.orderDate),
          expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
          status: formData.status,
        },
        currentUser.uid,
        userData.companyId
      );
      setSuccess('Purchase order created successfully');
      setShowCreateForm(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    }
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      supplierId: po.supplierId,
      orderDate: po.orderDate.toISOString().split('T')[0],
      expectedDate: po.expectedDate ? po.expectedDate.toISOString().split('T')[0] : '',
      items: po.items,
      status: po.status,
    });
    setError('');
    setSuccess('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    setError('');
    setSuccess('');

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    if (formData.items.some(item => !item.partId || item.quantity <= 0)) {
      setError('Please fill in all item details correctly');
      return;
    }

    try {
      await updatePurchaseOrderItems(editingPO.id, formData.items);
      if (formData.supplierId !== editingPO.supplierId || formData.orderDate !== editingPO.orderDate.toISOString().split('T')[0] || formData.expectedDate !== (editingPO.expectedDate?.toISOString().split('T')[0] || '')) {
        await updatePurchaseOrder(editingPO.id, {
          supplierId: formData.supplierId,
          orderDate: new Date(formData.orderDate),
          expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
        });
      }
      setSuccess('Purchase order updated successfully');
      setEditingPO(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update purchase order');
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to receive PO ${po.poNumber}? This will update stock quantities.`)) {
      return;
    }

    try {
      await receivePurchaseOrder(po.id);
      setSuccess('Purchase order received successfully. Stock updated.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to receive purchase order');
    }
  };

  const handleDelete = async () => {
    if (!deletingPO) return;

    try {
      await deletePurchaseOrder(deletingPO.id);
      setSuccess('Purchase order deleted successfully');
      setDeletingPO(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete purchase order');
    }
  };

  const handleStatusChange = async (po: PurchaseOrder, newStatus: PurchaseOrderStatus) => {
    try {
      await updatePurchaseOrder(po.id, { status: newStatus });
      setSuccess('Purchase order status updated successfully');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '',
      items: [],
      status: 'DRAFT',
    });
  };

  const totals = calculatePOTotals(formData.items);

  if (loading && purchaseOrders.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'INVENTORY_MANAGER']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading purchase orders...</p>
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
                  Purchase Orders
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Manage purchase orders and track stock receipts
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  resetForm();
                  setError('');
                  setSuccess('');
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Create Purchase Order
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

            {/* Create/Edit Form */}
            {(showCreateForm || editingPO) && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h2>
                <form onSubmit={editingPO ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Supplier <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.supplierId}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        disabled={!!editingPO}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
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
                        Order Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.orderDate}
                        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Expected Date
                      </label>
                      <input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Items <span className="text-red-500">*</span>
                      </label>
                      {(!editingPO || editingPO.status === 'DRAFT') && (
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Add Item
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                        <thead className="bg-zinc-50 dark:bg-zinc-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Part</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">GST %</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Total</th>
                            {(!editingPO || editingPO.status === 'DRAFT') && (
                              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2">
                                <select
                                  required
                                  value={item.partId}
                                  onChange={(e) => handleItemChange(index, 'partId', e.target.value)}
                                  disabled={!!editingPO && editingPO.status !== 'DRAFT'}
                                  className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  <option value="">Select Part</option>
                                  {parts.map((part) => (
                                    <option key={part.id} value={part.id}>
                                      {part.partCode} - {part.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                  disabled={!!editingPO && editingPO.status !== 'DRAFT'}
                                  className="block w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  value={item.unitPrice}
                                  onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  disabled={!!editingPO && editingPO.status !== 'DRAFT'}
                                  className="block w-24 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="28"
                                  required
                                  value={item.gstSlab}
                                  onChange={(e) => handleItemChange(index, 'gstSlab', parseInt(e.target.value) as 5 | 18 | 28)}
                                  disabled={!!editingPO && editingPO.status !== 'DRAFT'}
                                  className="block w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                ₹{item.total.toFixed(2)}
                              </td>
                              {(!editingPO || editingPO.status === 'DRAFT') && (
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {formData.items.length === 0 && (
                        <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                          No items added. Click "Add Item" to add items to this purchase order.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  {formData.items.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <div className="ml-auto max-w-xs space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">₹{totals.subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Total GST:</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">₹{totals.totalGst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 text-base font-semibold">
                          <span className="text-zinc-900 dark:text-zinc-50">Grand Total:</span>
                          <span className="text-zinc-900 dark:text-zinc-50">₹{totals.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingPO(null);
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

            {/* View PO Modal */}
            {viewingPO && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-black dark:text-zinc-50">PO {viewingPO.poNumber}</h2>
                    <button
                      onClick={() => setViewingPO(null)}
                      className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Supplier:</span>
                        <p className="font-medium text-black dark:text-zinc-50">{viewingPO.supplierName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Status:</span>
                        <span className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[viewingPO.status]}`}>
                          {viewingPO.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Order Date:</span>
                        <p className="font-medium text-black dark:text-zinc-50">{viewingPO.orderDate.toLocaleDateString()}</p>
                      </div>
                      {viewingPO.expectedDate && (
                        <div>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">Expected Date:</span>
                          <p className="font-medium text-black dark:text-zinc-50">{viewingPO.expectedDate.toLocaleDateString()}</p>
                        </div>
                      )}
                      {viewingPO.receivedDate && (
                        <div>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">Received Date:</span>
                          <p className="font-medium text-black dark:text-zinc-50">{viewingPO.receivedDate.toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold text-black dark:text-zinc-50">Items</h3>
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                        <thead className="bg-zinc-50 dark:bg-zinc-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Part</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">GST</th>
                            <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                          {viewingPO.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50">{item.name} ({item.partCode})</td>
                              <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">₹{item.unitPrice.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{item.gstSlab}%</td>
                              <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-400">₹{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                        <div className="ml-auto max-w-xs space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">₹{viewingPO.subTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-400">Total GST:</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">₹{viewingPO.totalGst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 text-base font-semibold">
                            <span className="text-zinc-900 dark:text-zinc-50">Grand Total:</span>
                            <span className="text-zinc-900 dark:text-zinc-50">₹{viewingPO.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation */}
            {deletingPO && (
              <div className="mb-8 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Delete Purchase Order
                </h2>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong>{deletingPO.poNumber}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDelete}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingPO(null)}
                    className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Purchase Orders List */}
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Order Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Expected Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {po.poNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {po.supplierName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[po.status]}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        ₹{po.grandTotal.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {po.orderDate.toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {po.expectedDate ? po.expectedDate.toLocaleDateString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingPO(po)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View
                          </button>
                          {po.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleEdit(po)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingPO(po)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'DRAFT' && (
                            <button
                              onClick={() => handleReceive(po)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Receive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {purchaseOrders.length === 0 && (
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                  No purchase orders found
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

