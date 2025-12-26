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
import { Company, CreateCompanyData } from './types';

const COMPANIES_COLLECTION = 'companies';

/**
 * Create a company
 */
export async function createCompany(data: CreateCompanyData): Promise<string> {
  const companyRef = doc(collection(db, COMPANIES_COLLECTION));
  const company: Omit<Company, 'id'> = {
    name: data.name,
    gstin: data.gstin,
    address: data.address,
    phone: data.phone,
    email: data.email,
    stateCode: data.stateCode,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(companyRef, {
    ...company,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return companyRef.id;
}

/**
 * Get company by ID
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
  const companySnap = await getDoc(companyRef);
  
  if (!companySnap.exists()) {
    return null;
  }
  
  const data = companySnap.data();
  return {
    id: companySnap.id,
    name: data.name,
    gstin: data.gstin,
    address: data.address,
    phone: data.phone,
    email: data.email,
    stateCode: data.stateCode,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all companies
 */
export async function getAllCompanies(): Promise<Company[]> {
  const companiesRef = collection(db, COMPANIES_COLLECTION);
  const q = query(companiesRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      gstin: data.gstin,
      address: data.address,
      phone: data.phone,
      email: data.email,
      stateCode: data.stateCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update company
 */
export async function updateCompany(
  companyId: string,
  data: Partial<CreateCompanyData>
): Promise<void> {
  const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
  await updateDoc(companyRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete company
 */
export async function deleteCompany(companyId: string): Promise<void> {
  const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
  await deleteDoc(companyRef);
}

