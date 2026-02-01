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
import { apiRequest } from './apiClient';

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
 * API request interface for creating a part
 */
interface CreatePartRequest {
  partCode?: string;
  unitsPrice: number;
  units: number;
  minStockAlert: number;
  supplierId?: string;
  partDesc?: string;
  partCompany?: string;
}

/**
 * API response interface for creating a part
 */
interface CreatePartResponse {
  partCode: string;
  unitsPrice: number;
  units: number;
  minStockAlert: number;
  createdOn: string;
  updatedOn: string;
}

/**
 * Create a part via API
 */
export async function createPart(data: CreatePartData, companyId: string, companyName?: string): Promise<string> {
  try {
    // Map form data to API request format
    const requestData: CreatePartRequest = {
      partCode: data.partCode || undefined, // Optional, will be auto-generated if empty
      unitsPrice: data.unitPrice,
      units: data.stockQty,
      minStockAlert: data.minStock,
      supplierId: data.supplierId || undefined, // Include supplier ID if provided
      partDesc: data.name || undefined, // Include part description if provided
      partCompany: companyName || undefined, // Include company name if provided
    };

    // Call API endpoint
    const response = await apiRequest<CreatePartResponse>(`/inventory/${companyId}/add`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    // Return partCode as the ID
    return response.partCode || 'success';
  } catch (error: any) {
    console.error('Error creating part via API:', error);
    throw new Error(error.message || 'Failed to create part');
  }
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
    companyId: data.companyId || '',
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
 * API response interface for inventory parts
 */
interface ApiPartResponse {
  partCode: string;
  unitsPrice: number;
  units: number;
  minStockAlert: number;
  createdOn: string;
  updatedOn: string;
}

/**
 * Get all parts for a company from API
 */
export async function getAllParts(companyId: string): Promise<Part[]> {
  if (!companyId || companyId.trim() === '') {
    console.warn('getAllParts: companyId is empty, returning empty array');
    return [];
  }
  
  try {
    // Fetch from API endpoint
    const response = await apiRequest<ApiPartResponse[]>(`/inventory/${companyId}/partcode`, {
      method: 'GET',
    });
    
    // Map API response to Part interface
    return response.map((apiPart, index) => ({
      id: apiPart.partCode || `part-${index}`, // Use partCode as ID if available, otherwise generate one
      companyId: companyId,
      partCode: apiPart.partCode,
      name: '', // API doesn't provide name
      category: 'OEM' as const, // Default category
      hsnCode: '', // API doesn't provide HSN code
      gstSlab: 5 as const, // Default GST slab
      stockQty: apiPart.units,
      minStock: apiPart.minStockAlert,
      unitPrice: apiPart.unitsPrice,
      supplierId: undefined,
      supplierName: undefined,
      barcode: undefined,
      createdAt: new Date(apiPart.createdOn),
      updatedAt: new Date(apiPart.updatedOn),
    }));
  } catch (error: any) {
    console.error('Error fetching parts from API:', error);
    throw new Error(error.message || 'Failed to fetch parts from API');
  }
}

/**
 * Get alerted/low stock parts from API
 */
export async function getAlertedParts(companyId: string): Promise<Part[]> {
  if (!companyId || companyId.trim() === '') {
    console.warn('getAlertedParts: companyId is empty, returning empty array');
    return [];
  }
  
  try {
    // Fetch from API endpoint
    const response = await apiRequest<ApiPartResponse[]>(`/inventory/${companyId}/alerts`, {
      method: 'GET',
    });
    
    // Map API response to Part interface
    return response.map((apiPart, index) => ({
      id: apiPart.partCode || `part-${index}`,
      companyId: companyId,
      partCode: apiPart.partCode,
      name: '', // API doesn't provide name
      category: 'OEM' as const, // Default category
      hsnCode: '', // API doesn't provide HSN code
      gstSlab: 5 as const, // Default GST slab
      stockQty: apiPart.units,
      minStock: apiPart.minStockAlert,
      unitPrice: apiPart.unitsPrice,
      supplierId: undefined,
      supplierName: undefined,
      barcode: undefined,
      createdAt: new Date(apiPart.createdOn),
      updatedAt: new Date(apiPart.updatedOn),
    }));
  } catch (error: any) {
    console.error('Error fetching alerted parts from API:', error);
    throw new Error(error.message || 'Failed to fetch alerted parts from API');
  }
}

/**
 * Search part by part code using API
 */
export async function searchPartByCode(partCode: string, companyId: string): Promise<Part | null> {
  if (!companyId || companyId.trim() === '') {
    console.warn('searchPartByCode: companyId is empty');
    return null;
  }
  
  if (!partCode || partCode.trim() === '') {
    return null;
  }
  
  try {
    // Fetch from API endpoint
    const response = await apiRequest<ApiPartResponse>(`/inventory/${companyId}/partcode/${encodeURIComponent(partCode)}`, {
      method: 'GET',
    });
    
    // Map API response to Part interface
    return {
      id: response.partCode,
      companyId: companyId,
      partCode: response.partCode,
      name: '', // API doesn't provide name
      category: 'OEM' as const, // Default category
      hsnCode: '', // API doesn't provide HSN code
      gstSlab: 5 as const, // Default GST slab
      stockQty: response.units,
      minStock: response.minStockAlert,
      unitPrice: response.unitsPrice,
      supplierId: undefined,
      supplierName: undefined,
      barcode: undefined,
      createdAt: new Date(response.createdOn),
      updatedAt: new Date(response.updatedOn),
    };
  } catch (error: any) {
    console.error('Error searching part by code:', error);
    // Return null if part not found (404) or other error
    return null;
  }
}

/**
 * Search parts by code, name, or barcode (filtered by company)
 */
export async function searchParts(searchTerm: string, companyId: string): Promise<Part[]> {
  // Try searching by part code first using API
  const part = await searchPartByCode(searchTerm.trim(), companyId);
  if (part) {
    return [part];
  }
  
  // Fallback to local search if API search doesn't find exact match
  const allParts = await getAllParts(companyId);
  
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
 * Get parts with low stock (stockQty <= minStock) for a company
 */
export async function getLowStockParts(companyId: string): Promise<Part[]> {
  const allParts = await getAllParts(companyId);
  return allParts.filter((part) => part.stockQty <= part.minStock);
}

// ==================== Supplier Functions ====================

/**
 * Create supplier
 */
export async function createSupplier(data: CreateSupplierData, companyId: string): Promise<string> {
  // Validate companyId
  const finalCompanyId = data.companyId || companyId;
  if (!finalCompanyId || finalCompanyId.trim() === '') {
    throw new Error('Company ID is required to create a supplier');
  }
  
  const supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
  const supplier: Omit<Supplier, 'id'> = {
    companyId: finalCompanyId,
    name: data.name,
    mobile: data.mobile || data.contact || '',
    gstin: data.gstin,
    address: data.address || '',
    contact: data.contact, // Keep for backward compatibility
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
    companyId: data.companyId || '',
    name: data.name,
    mobile: data.mobile || data.contact || '',
    gstin: data.gstin,
    address: data.address || '',
    contact: data.contact, // Keep for backward compatibility
    email: data.email,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all suppliers for a company
 */
export async function getAllSuppliers(companyId: string): Promise<Supplier[]> {
  if (!companyId || companyId.trim() === '') {
    console.warn('getAllSuppliers: companyId is empty, returning empty array');
    return [];
  }
  
  const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
  const q = query(
    suppliersRef,
    where('companyId', '==', companyId),
    orderBy('name', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId: data.companyId || companyId,
      name: data.name,
      mobile: data.mobile || data.contact || '',
      gstin: data.gstin,
      address: data.address || '',
      contact: data.contact, // Keep for backward compatibility
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


