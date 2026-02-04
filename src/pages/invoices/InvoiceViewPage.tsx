import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getInvoice } from '@/lib/invoiceService';
import { Invoice } from '@/lib/types';
import { InvoicePrint } from '@/components/InvoicePrint';

export default function InvoiceViewPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const invoiceData = await getInvoice(invoiceId!);
      if (!invoiceData) {
        setError('Invoice not found');
        return;
      }
      setInvoice(invoiceData);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading invoice...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-4xl min-w-0">
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error || 'Invoice not found'}</p>
            </div>
            <Link
              to="/invoices"
              className="mt-4 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Back to Invoices
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                Invoice {invoice.invoiceNo}
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {invoice.customerName} - {invoice.jobNo}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handlePrint}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Print
              </button>
              <Link
                to="/invoices"
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Back
              </Link>
            </div>
          </div>

          {showPrint ? (
            <InvoicePrint invoice={invoice} />
          ) : (
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 shadow">
              {/* Invoice Header */}
              <div className="mb-6 sm:mb-8 border-b border-zinc-200 dark:border-zinc-700 pb-6 sm:pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Invoice Details
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Invoice No: {invoice.invoiceNo}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Date: {invoice.invoiceDate.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Job No: {invoice.jobNo}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Customer
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {invoice.customerName}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {invoice.mobile}
                    </p>
                    {invoice.vehicleNo && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Vehicle: {invoice.vehicleNo}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6 sm:mb-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        HSN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {item.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {item.hsnCode}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          ₹{item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Summary */}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-8">
                <div className="mt-4 sm:mt-0 sm:ml-auto max-w-md space-y-2">
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Subtotal:</span>
                    <span>₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  {invoice.gstType === 'CGST_SGST' && (
                    <>
                      <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>CGST:</span>
                        <span>₹{invoice.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>SGST:</span>
                        <span>₹{invoice.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {invoice.gstType === 'IGST' && (
                    <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>IGST:</span>
                      <span>₹{invoice.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    <span>Total:</span>
                    <span>₹{invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Payment Status:</span>
                    <span className={`font-semibold ${
                      invoice.paymentStatus === 'PAID' ? 'text-green-600 dark:text-green-400' :
                      invoice.paymentStatus === 'PARTIAL' ? 'text-orange-600 dark:text-orange-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {invoice.paymentStatus}
                    </span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>Paid Amount:</span>
                      <span>₹{invoice.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
