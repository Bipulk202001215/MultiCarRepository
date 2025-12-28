import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getAllInvoices } from '@/lib/invoiceService';
import { Invoice, PaymentStatus, PaymentMode } from '@/lib/types';
import { Link } from 'react-router-dom';

function getPaymentStatusBadgeClass(status: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    PARTIAL: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    PAID: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  };
  return statusMap[status];
}

function formatPaymentStatus(status: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    PENDING: 'Pending',
    PARTIAL: 'Partial',
    PAID: 'Paid',
  };
  return statusMap[status];
}

function formatPaymentMode(mode: PaymentMode): string {
  const modeMap: Record<PaymentMode, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    MIXED: 'Mixed',
  };
  return modeMap[mode];
}

export default function InvoicesPage() {
  const { currentUser, userData } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && userData) {
      loadInvoices();
    }
  }, [currentUser, userData]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        setInvoices([]);
        return;
      }
      const allInvoices = await getAllInvoices(userData.companyId);
      setInvoices(allInvoices);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading invoices...</p>
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
                Invoices
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                View and manage all invoices
              </p>
            </div>
            <Link
              to="/invoices/create"
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Create Invoice
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-12 text-center shadow">
              <p className="text-zinc-600 dark:text-zinc-400">No invoices found</p>
              <Link
                to="/invoices/create"
                className="mt-4 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Create First Invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Invoice No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Job No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Payment Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {invoice.invoiceNo}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {invoice.jobNo}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {invoice.customerName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {invoice.invoiceDate.toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        ₹{invoice.total.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusBadgeClass(invoice.paymentStatus)}`}>
                          {formatPaymentStatus(invoice.paymentStatus)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatPaymentMode(invoice.paymentMode)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

