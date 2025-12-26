'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getAllJobCards } from '@/lib/jobService';
import { getAllParts, searchParts } from '@/lib/inventoryService';
import { convertJobItemsToInvoiceItems, calculateInvoiceItem, createInvoice } from '@/lib/invoiceService';
import { markInvoiceAsPaid, recordPartialPayment } from '@/lib/paymentService';
import { JobCard, Part, InvoiceItem, GSTType, PaymentMode, GSTSlab } from '@/lib/types';
import Link from 'next/link';

export default function CreateInvoicePage() {
  const router = useRouter();
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Job selection
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Parts for adding
  const [parts, setParts] = useState<Part[]>([]);
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);

  // GST and payment
  const [gstType, setGstType] = useState<GSTType>('CGST_SGST');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Calculations
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const cgst = invoiceItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgst = invoiceItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igst = invoiceItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const total = subtotal + cgst + sgst + igst;

  useEffect(() => {
    if (userData?.companyId) {
      loadJobs();
      loadParts();
    }
  }, [userData?.companyId]);

  useEffect(() => {
    if (partSearchTerm.trim()) {
      const filtered = parts.filter(part =>
        part.name.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
        part.partCode.toLowerCase().includes(partSearchTerm.toLowerCase())
      );
      setFilteredParts(filtered);
    } else {
      setFilteredParts([]);
    }
  }, [partSearchTerm, parts]);

  useEffect(() => {
    if (selectedJobId) {
      loadJobItems();
    } else {
      setInvoiceItems([]);
      setSelectedJob(null);
    }
  }, [selectedJobId]);

  // Recalculate items when GST type changes
  useEffect(() => {
    if (invoiceItems.length > 0 && selectedJobId) {
      const recalculated = invoiceItems.map(item => calculateInvoiceItem(
        {
          partId: item.partId,
          partCode: item.partCode,
          name: item.name,
          hsnCode: item.hsnCode,
          gstSlab: item.gstSlab,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          type: item.type,
        },
        gstType
      ));
      setInvoiceItems(recalculated);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [gstType]);

  const loadJobs = async () => {
    try {
      if (!userData?.companyId) {
        setError('Company not found. Please contact administrator to assign you to a company.');
        setJobs([]);
        return;
      }
      const allJobs = await getAllJobCards(userData.companyId);
      setJobs(allJobs);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    }
  };

  const loadParts = async () => {
    try {
      if (!userData?.companyId) return;
      const allParts = await getAllParts(userData.companyId);
      setParts(allParts);
    } catch (err: any) {
      console.error('Failed to load parts:', err);
    }
  };

  const loadJobItems = async () => {
    try {
      setLoading(true);
      const job = jobs.find(j => j.id === selectedJobId);
      if (!job) return;

      setSelectedJob(job);
      const items = await convertJobItemsToInvoiceItems(selectedJobId, gstType);
      const calculatedItems = items.map(item => calculateInvoiceItem(item, gstType));
      setInvoiceItems(calculatedItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load job items');
    } finally {
      setLoading(false);
    }
  };

  const addPart = (part: Part) => {
    const newItem: Omit<InvoiceItem, 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'total'> = {
      partId: part.id,
      partCode: part.partCode,
      name: part.name,
      hsnCode: part.hsnCode,
      gstSlab: part.gstSlab,
      quantity: 1,
      unitPrice: part.unitPrice,
      type: 'PART',
    };
    const calculatedItem = calculateInvoiceItem(newItem, gstType);
    setInvoiceItems([...invoiceItems, calculatedItem]);
    setPartSearchTerm('');
    setFilteredParts([]);
  };

  const removeItem = (index: number) => {
    const updated = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updated);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    const updated = [...invoiceItems];
    const item = updated[index];
    const newItem = calculateInvoiceItem(
      {
        partId: item.partId,
        partCode: item.partCode,
        name: item.name,
        hsnCode: item.hsnCode,
        gstSlab: item.gstSlab,
        quantity,
        unitPrice: item.unitPrice,
        type: item.type,
      },
      gstType
    );
    updated[index] = newItem;
    setInvoiceItems(updated);
  };

  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    const updated = [...invoiceItems];
    const item = updated[index];
    const newItem = calculateInvoiceItem(
      {
        partId: item.partId,
        partCode: item.partCode,
        name: item.name,
        hsnCode: item.hsnCode,
        gstSlab: item.gstSlab,
        quantity: item.quantity,
        unitPrice: price,
        type: item.type,
      },
      gstType
    );
    updated[index] = newItem;
    setInvoiceItems(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedJobId) {
      setError('Please select a job');
      return;
    }

    if (invoiceItems.length === 0) {
      setError('Please add at least one item to the invoice');
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to create an invoice');
      return;
    }

    setLoading(true);

    try {
      // Create invoice
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        return;
      }
      const invoiceId = await createInvoice(
        {
          jobId: selectedJobId,
          items: invoiceItems,
          paymentStatus: isPartialPayment ? 'PARTIAL' : paymentMode === 'CASH' || paymentMode === 'UPI' ? 'PAID' : 'PENDING',
          paymentMode,
          paidAmount: isPartialPayment ? parseFloat(partialAmount) : (paymentMode === 'CASH' || paymentMode === 'UPI' ? total : 0),
          gstType,
          invoiceDate: new Date(),
        },
        currentUser.uid,
        userData.companyId
      );

      // Handle payment
      if (isPartialPayment) {
        await recordPartialPayment(invoiceId, parseFloat(partialAmount), paymentMode);
      } else if (paymentMode === 'CASH' || paymentMode === 'UPI') {
        await markInvoiceAsPaid(invoiceId, paymentMode);
      }

      setSuccess('Invoice created successfully!');
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'ACCOUNTANT']}>
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Create Invoice
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Generate a GST-compliant invoice for a job
              </p>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Selection */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Select Job
                </h2>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Job <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a job...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.jobNo} - {job.customerName} {job.vehicleNo ? `(${job.vehicleNo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedJob && (
                  <div className="mt-4 rounded-md bg-zinc-50 dark:bg-zinc-800 p-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <strong>Customer:</strong> {selectedJob.customerName} | <strong>Mobile:</strong> {selectedJob.mobile}
                      {selectedJob.vehicleNo && ` | <strong>Vehicle:</strong> ${selectedJob.vehicleNo}`}
                    </p>
                  </div>
                )}
              </div>

              {/* GST Type Selection */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  GST Type
                </h2>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Select GST Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gstType}
                    onChange={(e) => setGstType(e.target.value as GSTType)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="CGST_SGST">CGST + SGST (Intra-state)</option>
                    <option value="IGST">IGST (Inter-state)</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Invoice Items
                </h2>

                {/* Add Part */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Add Part
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={partSearchTerm}
                      onChange={(e) => setPartSearchTerm(e.target.value)}
                      placeholder="Search parts by name or code..."
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {filteredParts.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                        {filteredParts.map((part) => (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => addPart(part)}
                            className="w-full px-4 py-2 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            {part.partCode} - {part.name} (₹{part.unitPrice})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                {invoiceItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                      <thead className="bg-zinc-50 dark:bg-zinc-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            HSN
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Taxable
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            {gstType === 'IGST' ? 'IGST' : 'CGST'}
                          </th>
                          {gstType === 'CGST_SGST' && (
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                              SGST
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                        {invoiceItems.map((item, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              {item.hsnCode}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                                className="w-24 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              ₹{item.taxableAmount.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              ₹{gstType === 'IGST' ? item.igstAmount.toFixed(2) : item.cgstAmount.toFixed(2)}
                            </td>
                            {gstType === 'CGST_SGST' && (
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                ₹{item.sgstAmount.toFixed(2)}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              ₹{item.total.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No items added. Select a job to auto-load items or add parts manually.
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Summary
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                    <span className="font-medium text-black dark:text-zinc-50">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {gstType === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">CGST:</span>
                        <span className="font-medium text-black dark:text-zinc-50">₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">SGST:</span>
                        <span className="font-medium text-black dark:text-zinc-50">₹{sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">IGST:</span>
                      <span className="font-medium text-black dark:text-zinc-50">₹{igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between">
                    <span className="text-lg font-semibold text-black dark:text-zinc-50">Grand Total:</span>
                    <span className="text-lg font-semibold text-black dark:text-zinc-50">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Payment
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => {
                        setPaymentMode(e.target.value as PaymentMode);
                        setIsPartialPayment(false);
                      }}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPartialPayment}
                        onChange={(e) => setIsPartialPayment(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-600"
                      />
                      <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                        Partial Payment
                      </span>
                    </label>
                  </div>

                  {isPartialPayment && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Partial Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={total}
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required={isPartialPayment}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
                <Link
                  href="/invoices"
                  className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

