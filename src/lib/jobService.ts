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
import { JobCard, CreateJobCardData, JobStatus } from './types';

const JOBS_COLLECTION = 'jobCards';
const COUNTERS_COLLECTION = 'counters';

/**
 * Generate job number in format: JOBID{vehicleNumber}{ddMMyyyhhmmss}
 * Example: JOBIDABC123401122024143025
 */
function generateJobNo(vehicleNo?: string): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const vehiclePart = vehicleNo ? vehicleNo.replace(/\s+/g, '').toUpperCase() : 'NOVEH';
  const dateTimePart = `${day}${month}${year}${hours}${minutes}${seconds}`;
  
  return `JOBID${vehiclePart}${dateTimePart}`;
}

/**
 * Create a job card
 */
export async function createJobCard(
  data: CreateJobCardData,
  createdBy: string
): Promise<string> {
  const jobNo = generateJobNo(data.vehicleNo);
  
  const jobRef = doc(collection(db, JOBS_COLLECTION));
  const jobCard: Omit<JobCard, 'id'> = {
    jobNo,
    vehicleNo: data.vehicleNo,
    customerName: data.customerName || '',
    mobile: data.mobile || '',
    kmReading: data.kmReading || '',
    carMake: data.carMake,
    carModel: data.carModel,
    carYear: data.carYear,
    jobDescriptions: data.jobDescriptions,
    status: data.status,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(jobRef, {
    ...jobCard,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return jobRef.id;
}

/**
 * Get job card by ID
 */
export async function getJobCard(jobId: string): Promise<JobCard | null> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  const jobSnap = await getDoc(jobRef);
  
  if (!jobSnap.exists()) {
    return null;
  }
  
  const data = jobSnap.data();
  return {
    id: jobSnap.id,
    jobNo: data.jobNo,
    vehicleNo: data.vehicleNo,
    customerName: data.customerName,
    mobile: data.mobile,
    kmReading: data.kmReading,
    carMake: data.carMake,
    carModel: data.carModel,
    carYear: data.carYear,
    jobDescriptions: data.jobDescriptions,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all job cards
 */
export async function getAllJobCards(): Promise<JobCard[]> {
  const jobsRef = collection(db, JOBS_COLLECTION);
  const q = query(jobsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      jobNo: data.jobNo,
      vehicleNo: data.vehicleNo,
      customerName: data.customerName,
      mobile: data.mobile,
      kmReading: data.kmReading,
      carMake: data.carMake,
      carModel: data.carModel,
      carYear: data.carYear,
      jobDescriptions: data.jobDescriptions,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get job cards by creator
 */
export async function getJobCardsByCreator(userId: string): Promise<JobCard[]> {
  const jobsRef = collection(db, JOBS_COLLECTION);
  const q = query(
    jobsRef, 
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      jobNo: data.jobNo,
      vehicleNo: data.vehicleNo,
      customerName: data.customerName,
      mobile: data.mobile,
      kmReading: data.kmReading,
      carMake: data.carMake,
      carModel: data.carModel,
      carYear: data.carYear,
      jobDescriptions: data.jobDescriptions,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get job cards by status
 */
export async function getJobCardsByStatus(status: JobStatus): Promise<JobCard[]> {
  const jobsRef = collection(db, JOBS_COLLECTION);
  const q = query(
    jobsRef, 
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      jobNo: data.jobNo,
      vehicleNo: data.vehicleNo,
      customerName: data.customerName,
      mobile: data.mobile,
      kmReading: data.kmReading,
      carMake: data.carMake,
      carModel: data.carModel,
      carYear: data.carYear,
      jobDescriptions: data.jobDescriptions,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update job card
 */
export async function updateJobCard(
  jobId: string,
  data: Partial<CreateJobCardData>
): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await updateDoc(jobRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update job card status
 */
export async function updateJobCardStatus(
  jobId: string,
  status: JobStatus
): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await updateDoc(jobRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete job card
 */
export async function deleteJobCard(jobId: string): Promise<void> {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await deleteDoc(jobRef);
}

/**
 * Search vehicles by vehicle number (for auto-fill)
 * This would query a vehicles collection - placeholder for now
 */
export async function searchVehicle(vehicleNo: string): Promise<{
  make?: string;
  model?: string;
  year?: number;
} | null> {
  // TODO: Implement vehicle search from vehicles collection
  // For now, return null
  return null;
}

