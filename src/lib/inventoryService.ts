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
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Part, CreatePartData, Supplier, CreateSupplierData } from './types';

const PARTS_COLLECTION = 'parts';
const SUPPLIERS_COLLECTION = 'suppliers';
const COUNTERS_COLLECTION = 'counters';

/**
 * Generate part code in format: PART-XXX
 */
async function generatePartCode(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, 'parts');
  const counterSnap = await getDoc(counterRef);
  
  let nextCount = 1;
  if (counterSnap.exists()) {
    const currentCount = counterSnap.data().count || 0;
    nextCount = currentCount + 1;
    await updateDoc(counterRef, { count: nextCount });
  } else {
    await setDoc(counterRef, { count: 1 });
  }
  
  return `PART-${nextCount.toString().padStart(6, '0')}`;
}

/**
 * Create a part
 */
export async function createPart(data: CreatePartData): Promise<string> {
  const partCode = data.partCode || await generatePartCode();
  
  const partRef = doc(collection(db, PARTS_COLLECTION));
  const part: Omit<Part, 'id'> = {
    partCode,
    name: data.name,
    category: data.category,
    hsnCode: data.hsnCode,
    gstSlab: data.gstSlab,
    stockQty: data.stockQty,
    minStock: data.minStock,
    unitPrice: data.unitPrice,
    supplierId: data.supplierId,
    barcode: data.barcode,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // If supplierId is provided, fetch supplier name
  if (data.supplierId) {
    try {
      const supplier = await getSupplier(data.supplierId);
      if (supplier) {
        part.supplierName = supplier.name;
      }
    } catch (err) {
      // Supplier not found, continue without supplier name
    }
  }
  
  await setDoc(partRef, {
    ...part,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return partRef.id;
}

/**
 * Get part by ID
 */
export async function getPart(partId: string): Promise<Part | null> {
  const partRef = doc(db, PARTS_COLLECTION, partId);
  const partSnap = await getDoc(partRef);
  
  if (!partSnap.exists()) {
    return null;
  }
  
  const data = partSnap.data();
  return {
    id: partSnap.id,
    partCode: data.partCode,
    name: data.name,
    category: data.category,
    hsnCode: data.hsnCode,
    gstSlab: data.gstSlab,
    stockQty: data.stockQty,
    minStock: data.minStock,
    unitPrice: data.unitPrice,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    barcode: data.barcode,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all parts
 */
export async function getAllParts(): Promise<Part[]> {
  const partsRef = collection(db, PARTS_COLLECTION);
  const q = query(partsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      partCode: data.partCode,
      name: data.name,
      category: data.category,
      hsnCode: data.hsnCode,
      gstSlab: data.gstSlab,
      stockQty: data.stockQty,
      minStock: data.minStock,
      unitPrice: data.unitPrice,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      barcode: data.barcode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Search parts by code, name, or barcode
 */
export async function searchParts(searchTerm: string): Promise<Part[]> {
  const partsRef = collection(db, PARTS_COLLECTION);
  const allParts = await getAllParts();
  
  // Filter parts by search term (case-insensitive)
  const term = searchTerm.toLowerCase().trim();
  return allParts.filter((part) => 
    part.partCode.toLowerCase().includes(term) ||
    part.name.toLowerCase().includes(term) ||
    (part.barcode && part.barcode.toLowerCase().includes(term))
  );
}

/**
 * Update part
 */
export async function updatePart(
  partId: string,
  data: Partial<CreatePartData>
): Promise<void> {
  const partRef = doc(db, PARTS_COLLECTION, partId);
  
  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // If supplierId is provided, fetch supplier name
  if (data.supplierId !== undefined) {
    if (data.supplierId) {
      try {
        const supplier = await getSupplier(data.supplierId);
        if (supplier) {
          updateData.supplierName = supplier.name;
        }
      } catch (err) {
        // Supplier not found, continue without supplier name
      }
    } else {
      updateData.supplierName = null;
    }
  }
  
  await updateDoc(partRef, updateData);
}

/**
 * Delete part
 */
export async function deletePart(partId: string): Promise<void> {
  const partRef = doc(db, PARTS_COLLECTION, partId);
  await deleteDoc(partRef);
}

/**
 * Update stock quantity
 */
export async function updateStock(partId: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<void> {
  const part = await getPart(partId);
  if (!part) {
    throw new Error('Part not found');
  }

  let newStock: number;
  if (operation === 'add') {
    newStock = part.stockQty + quantity;
  } else if (operation === 'subtract') {
    newStock = Math.max(0, part.stockQty - quantity);
  } else {
    newStock = quantity;
  }

  await updateDoc(doc(db, PARTS_COLLECTION, partId), {
    stockQty: newStock,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get parts with low stock (stockQty <= minStock)
 */
export async function getLowStockParts(): Promise<Part[]> {
  const allParts = await getAllParts();
  return allParts.filter((part) => part.stockQty <= part.minStock);
}

// ==================== Supplier Functions ====================

/**
 * Create supplier
 */
export async function createSupplier(data: CreateSupplierData): Promise<string> {
  const supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
  const supplier: Omit<Supplier, 'id'> = {
    name: data.name,
    gstin: data.gstin,
    contact: data.contact,
    address: data.address,
    email: data.email,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(supplierRef, {
    ...supplier,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return supplierRef.id;
}

/**
 * Get supplier by ID
 */
export async function getSupplier(supplierId: string): Promise<Supplier | null> {
  const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  const supplierSnap = await getDoc(supplierRef);
  
  if (!supplierSnap.exists()) {
    return null;
  }
  
  const data = supplierSnap.data();
  return {
    id: supplierSnap.id,
    name: data.name,
    gstin: data.gstin,
    contact: data.contact,
    address: data.address,
    email: data.email,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all suppliers
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
  const q = query(suppliersRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      gstin: data.gstin,
      contact: data.contact,
      address: data.address,
      email: data.email,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update supplier
 */
export async function updateSupplier(
  supplierId: string,
  data: Partial<CreateSupplierData>
): Promise<void> {
  const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  await updateDoc(supplierRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete supplier
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  await deleteDoc(supplierRef);
}


