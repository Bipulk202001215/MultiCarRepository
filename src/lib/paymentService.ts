import { updateInvoicePayment, getInvoice } from './invoiceService';
import { PaymentStatus, PaymentMode } from './types';

/**
 * Record payment for an invoice
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  paymentMode: PaymentMode,
  isPartial: boolean = false
): Promise<void> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const newPaidAmount = invoice.paidAmount + amount;
  let paymentStatus: PaymentStatus;
  
  if (newPaidAmount >= invoice.total) {
    paymentStatus = 'PAID';
  } else if (newPaidAmount > 0) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'PENDING';
  }
  
  await updateInvoicePayment(
    invoiceId,
    paymentStatus,
    newPaidAmount,
    paymentMode
  );
}

/**
 * Mark invoice as paid (for Cash/UPI immediate payment)
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  paymentMode: 'CASH' | 'UPI'
): Promise<void> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  await updateInvoicePayment(
    invoiceId,
    'PAID',
    invoice.total,
    paymentMode
  );
}

/**
 * Record partial payment
 */
export async function recordPartialPayment(
  invoiceId: string,
  amount: number,
  paymentMode: PaymentMode
): Promise<void> {
  await recordPayment(invoiceId, amount, paymentMode, true);
}

