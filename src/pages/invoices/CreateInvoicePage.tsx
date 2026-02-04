import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createInvoiceApi } from '@/lib/apiClient';
import { getJobsByCompanyId } from '@/lib/apiClient';
import { getAllParts } from '@/lib/inventoryService';
import { Part } from '@/lib/types';

interface InvoiceItem {
  partCode: string;
  units: number;
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData } = useAuth();
  
  // Redirect to invoices page if accessed directly (not from invoices page)
  useEffect(() => {
    // If accessed directly via URL without state, redirect to invoices page
    if (!location.state?.fromInvoices) {
      navigate('/invoices', { replace: true });
    }
  }, [location, navigate]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Jobs
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Parts
  const [parts, setParts] = useState<Part[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    paymentStatus: 'PENDING' as 'PENDING' | 'PARTIAL' | 'PAID',
    paymentMode: 'UPI' as 'CASH' | 'UPI' | 'MIXED',
  });

  useEffect(() => {
    if (userData?.companyId) {
      loadJobs();
      loadParts();
    }
  }, [userData?.companyId]);

  const loadJobs = async () => {
    try {
      if (!userData?.companyId) return;
      const jobsData = await getJobsByCompanyId(userData.companyId);
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    }
  };

  const loadParts = async () => {
    try {
      if (!userData?.companyId) return;
      const partsData = await getAllParts(userData.companyId);
      setParts(partsData);
    } catch (err: any) {
      console.error('Failed to load parts:', err);
    }
  };

  const addItem = (partCode: string) => {
    const existingItem = invoiceItems.find(item => item.partCode === partCode);
    if (existingItem) {
      setInvoiceItems(invoiceItems.map(item =>
        item.partCode === partCode
          ? { ...item, units: item.units + 1 }
          : item
      ));
    } else {
      setInvoiceItems([...invoiceItems, { partCode, units: 1 }]);
    }
  };

  const removeItem = (partCode: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.partCode !== partCode));
  };

  const updateUnits = (partCode: string, units: number) => {
    if (units <= 0) {
      removeItem(partCode);
      return;
    }
    setInvoiceItems(invoiceItems.map(item =>
      item.partCode === partCode ? { ...item, units } : item
    ));
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

    if (!userData?.companyId || userData.companyId.trim() === '') {
      setError('Company not found. Please contact administrator to assign you to a company.');
      return;
    }

    setLoading(true);

    try {
      // Prepare invoice data in the exact format required
      const invoiceData = {
        jobId: selectedJobId,
        companyId: userData.companyId,
        subtotal: formData.subtotal,
        cgst: formData.cgst,
        sgst: formData.sgst,
        igst: formData.igst,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        items: invoiceItems,
      };

      await createInvoiceApi(invoiceData);
      setSuccess('Invoice created successfully!');
      setTimeout(() => {
        navigate('/invoices');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
              Create Invoice
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Generate an invoice for a job
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
                    <option key={job.jobCardId || job.id} value={job.jobCardId || job.id}>
                      {job.jobNo || job.jobCardId} - {job.customerName || 'N/A'} {job.vehicleNo ? `(${job.vehicleNo})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Items */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Add Items
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Select Part
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a part to add...</option>
                  {parts.map((part) => (
                    <option key={part.id} value={part.partCode}>
                      {part.partCode} - {part.name} (₹{part.unitPrice})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              {invoiceItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Part Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Units
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {invoiceItems.map((item) => {
                        const part = parts.find(p => p.partCode === item.partCode);
                        return (
                          <tr key={item.partCode}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                              {item.partCode} {part && `- ${part.name}`}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              <input
                                type="number"
                                min="1"
                                value={item.units}
                                onChange={(e) => updateUnits(item.partCode, parseInt(e.target.value) || 1)}
                                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <button
                                type="button"
                                onClick={() => removeItem(item.partCode)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No items added. Select parts to add them to the invoice.
                </p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Invoice Details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Subtotal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.subtotal === 0 ? '' : formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    CGST <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cgst === 0 ? '' : formData.cgst}
                    onChange={(e) => setFormData({ ...formData, cgst: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    SGST <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sgst === 0 ? '' : formData.sgst}
                    onChange={(e) => setFormData({ ...formData, sgst: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    IGST <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.igst === 0 ? '' : formData.igst}
                    onChange={(e) => setFormData({ ...formData, igst: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'PENDING' | 'PARTIAL' | 'PAID' })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'CASH' | 'UPI' | 'MIXED' })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="MIXED">MIXED</option>
                  </select>
                </div>
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
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
