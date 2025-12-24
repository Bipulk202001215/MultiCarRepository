import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { PurchaseOrder, CreatePurchaseOrderData, PurchaseOrderItem, PurchaseOrderStatus } from './types';
import { getSupplier } from './inventoryService';
import { updateStock } from './inventoryService';

const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';
const COUNTERS_COLLECTION = 'counters';

/**
 * Generate PO number in format: PO-XXXXXX
 */
async function generatePONumber(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, 'purchaseOrders');
  const counterSnap = await getDoc(counterRef);
  
  let nextCount = 1;
  if (counterSnap.exists()) {
    const currentCount = counterSnap.data().count || 0;
    nextCount = currentCount + 1;
    await updateDoc(counterRef, { count: nextCount });
  } else {
    await setDoc(counterRef, { count: 1 });
  }
  
  return `PO-${nextCount.toString().padStart(6, '0')}`;
}

/**
 * Calculate totals for purchase order items
 */
export function calculatePOTotals(items: PurchaseOrderItem[]): { subTotal: number; totalGst: number; grandTotal: number } {
  let subTotal = 0;
  let totalGst = 0;
  
  items.forEach((item) => {
    const itemSubTotal = item.quantity * item.unitPrice;
    const itemGst = itemSubTotal * (item.gstSlab / 100);
    subTotal += itemSubTotal;
    totalGst += itemGst;
    // Update item total (with GST included)
    item.total = itemSubTotal + itemGst;
  });
  
  const grandTotal = subTotal + totalGst;
  
  return { subTotal, totalGst, grandTotal };
}

/**
 * Create a purchase order
 */
export async function createPurchaseOrder(data: CreatePurchaseOrderData, createdBy: string): Promise<string> {
  const poNumber = await generatePONumber();
  
  // Fetch supplier name
  const supplier = await getSupplier(data.supplierId);
  if (!supplier) {
    throw new Error('Supplier not found');
  }
  
  // Calculate totals
  const totals = calculatePOTotals(data.items);
  
  const poRef = doc(collection(db, PURCHASE_ORDERS_COLLECTION));
  const po: Omit<PurchaseOrder, 'id'> = {
    poNumber,
    supplierId: data.supplierId,
    supplierName: supplier.name,
    status: data.status || 'DRAFT',
    items: data.items,
    subTotal: totals.subTotal,
    totalGst: totals.totalGst,
    grandTotal: totals.grandTotal,
    orderDate: data.orderDate,
    expectedDate: data.expectedDate,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(poRef, {
    ...po,
    orderDate: data.orderDate,
    expectedDate: data.expectedDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return poRef.id;
}

/**
 * Get purchase order by ID
 */
export async function getPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
  const poSnap = await getDoc(poRef);
  
  if (!poSnap.exists()) {
    return null;
  }
  
  const data = poSnap.data();
  return {
    id: poSnap.id,
    poNumber: data.poNumber,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    status: data.status,
    items: data.items || [],
    subTotal: data.subTotal,
    totalGst: data.totalGst,
    grandTotal: data.grandTotal,
    orderDate: data.orderDate?.toDate() || new Date(),
    expectedDate: data.expectedDate?.toDate(),
    receivedDate: data.receivedDate?.toDate(),
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all purchase orders
 */
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const posRef = collection(db, PURCHASE_ORDERS_COLLECTION);
  const q = query(posRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      poNumber: data.poNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      status: data.status,
      items: data.items || [],
      subTotal: data.subTotal,
      totalGst: data.totalGst,
      grandTotal: data.grandTotal,
      orderDate: data.orderDate?.toDate() || new Date(),
      expectedDate: data.expectedDate?.toDate(),
      receivedDate: data.receivedDate?.toDate(),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update purchase order status
 */
export async function updatePurchaseOrderStatus(poId: string, status: PurchaseOrderStatus): Promise<void> {
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (status === 'RECEIVED') {
    updateData.receivedDate = serverTimestamp();
  }
  
  await updateDoc(poRef, updateData);
}

/**
 * Receive purchase order - updates status and stock
 */
export async function receivePurchaseOrder(poId: string): Promise<void> {
  const po = await getPurchaseOrder(poId);
  if (!po) {
    throw new Error('Purchase order not found');
  }
  
  if (po.status === 'RECEIVED') {
    throw new Error('Purchase order already received');
  }
  
  // Update stock for each item
  for (const item of po.items) {
    await updateStock(item.partId, item.quantity, 'add');
  }
  
  // Update PO status to RECEIVED
  await updatePurchaseOrderStatus(poId, 'RECEIVED');
}

/**
 * Update purchase order items and recalculate totals
 */
export async function updatePurchaseOrderItems(poId: string, items: PurchaseOrderItem[]): Promise<void> {
  const po = await getPurchaseOrder(poId);
  if (!po) {
    throw new Error('Purchase order not found');
  }
  
  if (po.status !== 'DRAFT') {
    throw new Error('Can only update items for DRAFT purchase orders');
  }
  
  const totals = calculatePOTotals(items);
  
  await updateDoc(doc(db, PURCHASE_ORDERS_COLLECTION, poId), {
    items,
    subTotal: totals.subTotal,
    totalGst: totals.totalGst,
    grandTotal: totals.grandTotal,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update purchase order (supplier, dates, etc.)
 */
export async function updatePurchaseOrder(
  poId: string,
  data: Partial<{
    supplierId: string;
    expectedDate: Date;
    orderDate: Date;
    status: PurchaseOrderStatus;
  }>
): Promise<void> {
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
  const updateData: any = {
    updatedAt: serverTimestamp(),
  };
  
  if (data.supplierId) {
    const supplier = await getSupplier(data.supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    updateData.supplierId = data.supplierId;
    updateData.supplierName = supplier.name;
  }
  
  if (data.expectedDate) {
    updateData.expectedDate = data.expectedDate;
  }
  
  if (data.orderDate) {
    updateData.orderDate = data.orderDate;
  }
  
  if (data.status) {
    updateData.status = data.status;
  }
  
  await updateDoc(poRef, updateData);
}

/**
 * Delete purchase order
 */
export async function deletePurchaseOrder(poId: string): Promise<void> {
  const po = await getPurchaseOrder(poId);
  if (!po) {
    throw new Error('Purchase order not found');
  }
  
  if (po.status !== 'DRAFT') {
    throw new Error('Can only delete DRAFT purchase orders');
  }
  
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
  await deleteDoc(poRef);
}

