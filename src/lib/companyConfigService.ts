import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { CompanyConfig, CreateCompanyConfigData } from './types';

const COMPANY_CONFIG_COLLECTION = 'companyConfig';
const COMPANY_CONFIG_ID = 'default';

/**
 * Get company configuration
 */
export async function getCompanyConfig(): Promise<CompanyConfig | null> {
  const configRef = doc(db, COMPANY_CONFIG_COLLECTION, COMPANY_CONFIG_ID);
  const configSnap = await getDoc(configRef);
  
  if (!configSnap.exists()) {
    return null;
  }
  
  const data = configSnap.data();
  return {
    id: configSnap.id,
    gstin: data.gstin,
    name: data.name,
    address: data.address,
    phone: data.phone,
    email: data.email,
    bankDetails: data.bankDetails,
    stateCode: data.stateCode,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Create or update company configuration
 */
export async function setCompanyConfig(
  data: CreateCompanyConfigData
): Promise<void> {
  const configRef = doc(db, COMPANY_CONFIG_COLLECTION, COMPANY_CONFIG_ID);
  const configSnap = await getDoc(configRef);
  
  if (configSnap.exists()) {
    // Update existing config
    await updateDoc(configRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create new config
    await setDoc(configRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Get company GSTIN (with fallback to env var or default)
 */
export async function getCompanyGSTIN(): Promise<string> {
  const config = await getCompanyConfig();
  if (config?.gstin) {
    return config.gstin;
  }
  
  // Fallback to environment variable or default
  // In Vite, use import.meta.env.VITE_* instead of process.env.NEXT_PUBLIC_*
  return import.meta.env.VITE_COMPANY_GSTIN || '02LSNPS6493R1ZC';
}

