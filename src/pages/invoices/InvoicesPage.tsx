import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createInvoiceApi, getInvoicesApi } from '@/lib/apiClient';

interface InvoiceItem {
  partCode: string;
  units: number;
}

interface SubmittedInvoice {
  id: string;
  jobId: string;
  companyId: string;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  paymentMode: 'CASH' | 'UPI' | 'MIXED';
  items: InvoiceItem[];
  submittedAt: Date;
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [submittedInvoices, setSubmittedInvoices] = useState<SubmittedInvoice[]>([]);

  // Jobs
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Invoice items
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

  const addItem = () => {
    const partCode = `PART${invoiceItems.length + 1}`;
    setInvoiceItems([...invoiceItems, { partCode, units: 1 }]);
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

  const updatePartCode = (oldPartCode: string, newPartCode: string) => {
    setInvoiceItems(invoiceItems.map(item =>
      item.partCode === oldPartCode ? { ...item, partCode: newPartCode } : item
    ));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedJobId) {
      setError('Please enter a job ID');
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
        jobId: selectedJobId.trim(),
        companyId: userData.companyId.trim(),
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        items: invoiceItems.map(item => ({
          partCode: item.partCode.trim(),
          units: item.units,
        })),
      };

      // Log the data being sent (for debugging)
      if (import.meta.env.DEV) {
        console.log('📤 Sending invoice data:', JSON.stringify(invoiceData, null, 2));
      }

      await createInvoiceApi(invoiceData);
      setSuccess('Invoice created successfully!');
      
      // Add to submitted invoices list
      const newInvoice: SubmittedInvoice = {
        id: Date.now().toString(),
        jobId: invoiceData.jobId,
        companyId: invoiceData.companyId,
        paymentStatus: invoiceData.paymentStatus,
        paymentMode: invoiceData.paymentMode,
        items: invoiceData.items,
        submittedAt: new Date(),
      };
      setSubmittedInvoices([newInvoice, ...submittedInvoices]);
      
      // Reset form after success
      setTimeout(() => {
        setSelectedJobId('');
        setInvoiceItems([]);
        setFormData({
          subtotal: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          paymentStatus: 'PENDING',
          paymentMode: 'UPI',
        });
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedJobId('');
    setInvoiceItems([]);
    setFormData({
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      paymentStatus: 'PENDING',
      paymentMode: 'UPI',
    });
    setError('');
    setSuccess('');
  };

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      setError('');
      
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        return;
      }

      const invoicesData = await getInvoicesApi(userData.companyId);
      
      // Transform API response to match SubmittedInvoice interface
      const transformedInvoices: SubmittedInvoice[] = invoicesData.map((invoice: any) => ({
        id: invoice.id || invoice.invoiceId || Date.now().toString(),
        jobId: invoice.jobId || '',
        companyId: invoice.companyId || userData.companyId,
        paymentStatus: invoice.paymentStatus || 'PENDING',
        paymentMode: invoice.paymentMode || 'UPI',
        items: invoice.items || [],
        submittedAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      }));

      setSubmittedInvoices(transformedInvoices);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Invoice Management
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Create a new invoice
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode('form');
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'form'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                }`}
              >
                Invoice Detail
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  loadInvoices();
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                }`}
              >
                View All
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

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              {loadingInvoices ? (
                <div className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                  Loading invoices...
                </div>
              ) : submittedInvoices.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                  No invoices found.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Job ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Invoice ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Payment Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Submitted At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                    {submittedInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {invoice.jobId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            invoice.paymentStatus === 'PAID' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : invoice.paymentStatus === 'PARTIAL'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.paymentMode}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="space-y-1">
                            {invoice.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                {item.partCode}: {item.units} units
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.submittedAt.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Selection */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Job Information
              </h2>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Job ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="JOBID20241225143052123"
                  required
                />
              </div>
            </div>

            {/* Add Items */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                  Items
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
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
                      {invoiceItems.map((item) => (
                        <tr key={item.partCode}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                            <input
                              type="text"
                              value={item.partCode}
                              onChange={(e) => updatePartCode(item.partCode, e.target.value)}
                              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                              placeholder="ENG001"
                              required
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                            <input
                              type="number"
                              min="1"
                              value={item.units}
                              onChange={(e) => updateUnits(item.partCode, parseInt(e.target.value) || 1)}
                              className="w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                              required
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No items added. Click "Add Item" to add items to the invoice.
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
                {loading ? 'Creating...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
