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
import { Service, CreateServiceData } from './types';

const SERVICES_COLLECTION = 'services';

/**
 * Create a car part service
 */
export async function createService(data: CreateServiceData): Promise<string> {
  const serviceRef = doc(collection(db, SERVICES_COLLECTION));
  const service: Omit<Service, 'id'> = {
    companyId: data.companyId,
    name: data.name,
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(serviceRef, {
    ...service,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return serviceRef.id;
}

/**
 * Get service by ID
 */
export async function getService(serviceId: string): Promise<Service | null> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  const serviceSnap = await getDoc(serviceRef);
  
  if (!serviceSnap.exists()) {
    return null;
  }
  
  const data = serviceSnap.data();
  return {
    id: serviceSnap.id,
    companyId: data.companyId,
    name: data.name,
    description: data.description,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all services for a company
 */
export async function getServicesByCompany(companyId: string): Promise<Service[]> {
  const servicesRef = collection(db, SERVICES_COLLECTION);
  const q = query(
    servicesRef,
    where('companyId', '==', companyId),
    orderBy('name', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get all services
 */
export async function getAllServices(): Promise<Service[]> {
  const servicesRef = collection(db, SERVICES_COLLECTION);
  const q = query(servicesRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update service
 */
export async function updateService(
  serviceId: string,
  data: Partial<CreateServiceData>
): Promise<void> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  await updateDoc(serviceRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete service
 */
export async function deleteService(serviceId: string): Promise<void> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  await deleteDoc(serviceRef);
}

