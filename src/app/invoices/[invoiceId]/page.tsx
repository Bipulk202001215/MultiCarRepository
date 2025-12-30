'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getInvoice } from '@/lib/invoiceService';
import { Invoice } from '@/lib/types';
import { InvoicePrint } from '@/components/InvoicePrint';
import Link from 'next/link';

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.invoiceId as string;
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
      const invoiceData = await getInvoice(invoiceId);
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
      <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'ACCOUNTANT']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading invoice...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !invoice) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'ACCOUNTANT']}>
        <DashboardLayout>
          <div className="p-8">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error || 'Invoice not found'}</p>
              </div>
              <Link
                href="/invoices"
                className="mt-4 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Back to Invoices
              </Link>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'ACCOUNTANT']}>
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                  Invoice {invoice.invoiceNo}
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {invoice.customerName} - {invoice.jobNo}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handlePrint}
                  className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Print Invoice
                </button>
                <Link
                  href="/invoices"
                  className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Back to List
                </Link>
              </div>
            </div>

            {showPrint ? (
              <InvoicePrint invoice={invoice} />
            ) : (
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                    Invoice Details
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Invoice Number</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.invoiceNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Invoice Date</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">
                        {invoice.invoiceDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Job Number</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.jobNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Customer</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Mobile</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.mobile}</p>
                    </div>
                    {invoice.vehicleNo && (
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Vehicle Number</p>
                        <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.vehicleNo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                    Items
                  </h2>
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
                            {invoice.gstType === 'IGST' ? 'IGST' : 'CGST'}
                          </th>
                          {invoice.gstType === 'CGST_SGST' && (
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                              SGST
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                        {invoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              {item.hsnCode}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              {item.quantity}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              ₹{item.unitPrice.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              ₹{item.taxableAmount.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              ₹{invoice.gstType === 'IGST' ? item.igstAmount.toFixed(2) : item.cgstAmount.toFixed(2)}
                            </td>
                            {invoice.gstType === 'CGST_SGST' && (
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                ₹{item.sgstAmount.toFixed(2)}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              ₹{item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                    Summary
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                      <span className="font-medium text-black dark:text-zinc-50">₹{invoice.subtotal.toFixed(2)}</span>
                    </div>
                    {invoice.gstType === 'CGST_SGST' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">CGST:</span>
                          <span className="font-medium text-black dark:text-zinc-50">₹{invoice.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">SGST:</span>
                          <span className="font-medium text-black dark:text-zinc-50">₹{invoice.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">IGST:</span>
                        <span className="font-medium text-black dark:text-zinc-50">₹{invoice.igst.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between">
                      <span className="text-lg font-semibold text-black dark:text-zinc-50">Grand Total:</span>
                      <span className="text-lg font-semibold text-black dark:text-zinc-50">₹{invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                    Payment Information
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment Status</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.paymentStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment Mode</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">{invoice.paymentMode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Paid Amount</p>
                      <p className="text-lg font-medium text-black dark:text-zinc-50">₹{invoice.paidAmount.toFixed(2)}</p>
                    </div>
                    {invoice.paymentStatus === 'PARTIAL' && (
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Balance</p>
                        <p className="text-lg font-medium text-red-600 dark:text-red-400">
                          ₹{(invoice.total - invoice.paidAmount).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}




