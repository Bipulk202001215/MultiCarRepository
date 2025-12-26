import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Invoice, CreateInvoiceData, InvoiceItem, GSTType, GSTSlab } from './types';
import { getJobCard } from './jobService';
import { getJobItemsByJob, loadJobItemsForJob } from './jobItemService';
import { getCompanyGSTIN } from './companyConfigService';

const INVOICES_COLLECTION = 'invoices';
const COUNTERS_COLLECTION = 'counters';

/**
 * Calculate GST for an item
 */
export function calculateItemGST(
  taxableAmount: number,
  gstSlab: GSTSlab,
  gstType: GSTType
): { cgst: number; sgst: number; igst: number } {
  const gstAmount = (taxableAmount * gstSlab) / 100;
  
  if (gstType === 'IGST') {
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
    };
  } else {
    // CGST + SGST (split equally)
    const halfGst = gstAmount / 2;
    return {
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
    };
  }
}

/**
 * Calculate invoice item totals
 */
export function calculateInvoiceItem(
  item: Omit<InvoiceItem, 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'total'>,
  gstType: GSTType
): InvoiceItem {
  const taxableAmount = item.quantity * item.unitPrice;
  const { cgst, sgst, igst } = calculateItemGST(taxableAmount, item.gstSlab, gstType);
  const total = taxableAmount + cgst + sgst + igst;
  
  return {
    ...item,
    taxableAmount,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    total,
  };
}

/**
 * Generate invoice number in format: {GSTIN}/{YYMM}/{001}
 */
async function generateInvoiceNo(): Promise<string> {
  const gstin = await getCompanyGSTIN();
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yymm = `${year}${month}`;
  
  // Get or create counter for this month
  const counterId = `invoices-${yymm}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterId);
  const counterSnap = await getDoc(counterRef);
  
  let nextCount = 1;
  if (counterSnap.exists()) {
    const currentCount = counterSnap.data().count || 0;
    nextCount = currentCount + 1;
    await updateDoc(counterRef, { count: nextCount });
  } else {
    await setDoc(counterRef, { count: 1 });
  }
  
  const invoiceNumber = nextCount.toString().padStart(3, '0');
  return `${gstin}/${yymm}/${invoiceNumber}`;
}

/**
 * Create an invoice
 */
export async function createInvoice(
  data: CreateInvoiceData,
  createdBy: string,
  companyId: string
): Promise<string> {
  // Get job details
  const job = await getJobCard(data.jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  
  // Calculate item totals
  const calculatedItems = data.items.map(item => 
    calculateInvoiceItem(item, data.gstType)
  );
  
  // Calculate totals
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const cgst = calculatedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgst = calculatedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igst = calculatedItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const total = subtotal + cgst + sgst + igst;
  
  // Generate invoice number
  const invoiceNo = await generateInvoiceNo();
  
  // Create invoice
  const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
  const invoice: Omit<Invoice, 'id'> = {
    invoiceNo,
    companyId: data.companyId || companyId,
    jobId: data.jobId,
    jobNo: job.jobNo,
    customerName: job.customerName,
    mobile: job.mobile,
    vehicleNo: job.vehicleNo,
    items: calculatedItems,
    subtotal,
    cgst,
    sgst,
    igst,
    total,
    paymentStatus: data.paymentStatus,
    paymentMode: data.paymentMode,
    paidAmount: data.paidAmount,
    gstType: data.gstType,
    invoiceDate: data.invoiceDate,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(invoiceRef, {
    ...invoice,
    invoiceDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return invoiceRef.id;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  
  if (!invoiceSnap.exists()) {
    return null;
  }
  
  const data = invoiceSnap.data();
  return {
    id: invoiceSnap.id,
    invoiceNo: data.invoiceNo,
    companyId: data.companyId || '',
    jobId: data.jobId,
    jobNo: data.jobNo,
    customerName: data.customerName,
    mobile: data.mobile,
    vehicleNo: data.vehicleNo,
    items: data.items,
    subtotal: data.subtotal,
    cgst: data.cgst,
    sgst: data.sgst,
    igst: data.igst,
    total: data.total,
    paymentStatus: data.paymentStatus,
    paymentMode: data.paymentMode,
    paidAmount: data.paidAmount,
    gstType: data.gstType,
    invoiceDate: data.invoiceDate?.toDate() || new Date(),
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all invoices for a company
 */
export async function getAllInvoices(companyId: string): Promise<Invoice[]> {
  if (!companyId || companyId.trim() === '') {
    console.warn('getAllInvoices: companyId is empty, returning empty array');
    return [];
  }
  
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  const q = query(
    invoicesRef,
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      invoiceNo: data.invoiceNo,
      companyId: data.companyId || companyId,
      jobId: data.jobId,
      jobNo: data.jobNo,
      customerName: data.customerName,
      mobile: data.mobile,
      vehicleNo: data.vehicleNo,
      items: data.items,
      subtotal: data.subtotal,
      cgst: data.cgst,
      sgst: data.sgst,
      igst: data.igst,
      total: data.total,
      paymentStatus: data.paymentStatus,
      paymentMode: data.paymentMode,
      paidAmount: data.paidAmount,
      gstType: data.gstType,
      invoiceDate: data.invoiceDate?.toDate() || new Date(),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get invoices by job ID
 */
export async function getInvoicesByJob(jobId: string): Promise<Invoice[]> {
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  const q = query(
    invoicesRef,
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      invoiceNo: data.invoiceNo,
      jobId: data.jobId,
      jobNo: data.jobNo,
      customerName: data.customerName,
      mobile: data.mobile,
      vehicleNo: data.vehicleNo,
      items: data.items,
      subtotal: data.subtotal,
      cgst: data.cgst,
      sgst: data.sgst,
      igst: data.igst,
      total: data.total,
      paymentStatus: data.paymentStatus,
      paymentMode: data.paymentMode,
      paidAmount: data.paidAmount,
      gstType: data.gstType,
      invoiceDate: data.invoiceDate?.toDate() || new Date(),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update invoice payment status
 */
export async function updateInvoicePayment(
  invoiceId: string,
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID',
  paidAmount: number,
  paymentMode: 'CASH' | 'UPI' | 'MIXED'
): Promise<void> {
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  await updateDoc(invoiceRef, {
    paymentStatus,
    paidAmount,
    paymentMode,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  await deleteDoc(invoiceRef);
}

/**
 * Convert job items to invoice items
 */
export async function convertJobItemsToInvoiceItems(
  jobId: string,
  gstType: GSTType
): Promise<Omit<InvoiceItem, 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'total'>[]> {
  const jobItems = await loadJobItemsForJob(jobId);
  
  return jobItems.map(item => ({
    partId: item.partId,
    partCode: item.partCode,
    name: item.name,
    hsnCode: item.hsnCode,
    gstSlab: item.gstSlab,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    type: item.type,
  }));
}

