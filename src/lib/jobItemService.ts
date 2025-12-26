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
import { JobItem, CreateJobItemData, JobCard, JobDescription } from './types';
import { getJobCard } from './jobService';
import { getPart } from './inventoryService';

const JOB_ITEMS_COLLECTION = 'jobItems';

/**
 * Create a job item
 */
export async function createJobItem(
  data: CreateJobItemData
): Promise<string> {
  const itemRef = doc(collection(db, JOB_ITEMS_COLLECTION));
  const jobItem: Omit<JobItem, 'id'> = {
    jobId: data.jobId,
    partId: data.partId,
    partCode: data.partCode,
    name: data.name,
    hsnCode: data.hsnCode,
    gstSlab: data.gstSlab,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    type: data.type,
    createdAt: new Date(),
  };
  
  await setDoc(itemRef, {
    ...jobItem,
    createdAt: serverTimestamp(),
  });
  
  return itemRef.id;
}

/**
 * Get job item by ID
 */
export async function getJobItem(itemId: string): Promise<JobItem | null> {
  const itemRef = doc(db, JOB_ITEMS_COLLECTION, itemId);
  const itemSnap = await getDoc(itemRef);
  
  if (!itemSnap.exists()) {
    return null;
  }
  
  const data = itemSnap.data();
  return {
    id: itemSnap.id,
    jobId: data.jobId,
    partId: data.partId,
    partCode: data.partCode,
    name: data.name,
    hsnCode: data.hsnCode,
    gstSlab: data.gstSlab,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    type: data.type,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * Get all job items for a job
 */
export async function getJobItemsByJob(jobId: string): Promise<JobItem[]> {
  const itemsRef = collection(db, JOB_ITEMS_COLLECTION);
  const q = query(
    itemsRef,
    where('jobId', '==', jobId),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      jobId: data.jobId,
      partId: data.partId,
      partCode: data.partCode,
      name: data.name,
      hsnCode: data.hsnCode,
      gstSlab: data.gstSlab,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      type: data.type,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update job item
 */
export async function updateJobItem(
  itemId: string,
  data: Partial<CreateJobItemData>
): Promise<void> {
  const itemRef = doc(db, JOB_ITEMS_COLLECTION, itemId);
  await updateDoc(itemRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete job item
 */
export async function deleteJobItem(itemId: string): Promise<void> {
  const itemRef = doc(db, JOB_ITEMS_COLLECTION, itemId);
  await deleteDoc(itemRef);
}

/**
 * Auto-create job items from job descriptions (services)
 */
export async function createJobItemsFromJobDescriptions(
  jobId: string,
  jobDescriptions: JobDescription[]
): Promise<string[]> {
  const itemIds: string[] = [];
  
  for (const desc of jobDescriptions) {
    // Only create items for descriptions that have HSN code and GST slab
    if (desc.hsnCode && desc.gstSlab && desc.unitPrice) {
      const itemId = await createJobItem({
        jobId,
        name: `${desc.serviceType} - ${desc.description}`,
        hsnCode: desc.hsnCode,
        gstSlab: desc.gstSlab,
        quantity: 1,
        unitPrice: desc.unitPrice,
        type: 'SERVICE',
      });
      itemIds.push(itemId);
    }
  }
  
  return itemIds;
}

/**
 * Add part to job
 */
export async function addPartToJob(
  jobId: string,
  partId: string,
  quantity: number = 1
): Promise<string> {
  const part = await getPart(partId);
  if (!part) {
    throw new Error('Part not found');
  }
  
  return await createJobItem({
    jobId,
    partId: part.id,
    partCode: part.partCode,
    name: part.name,
    hsnCode: part.hsnCode,
    gstSlab: part.gstSlab,
    quantity,
    unitPrice: part.unitPrice,
    type: 'PART',
  });
}

/**
 * Load job items for a job (auto-create from job descriptions if needed)
 */
export async function loadJobItemsForJob(jobId: string): Promise<JobItem[]> {
  let items = await getJobItemsByJob(jobId);
  
  // If no items exist, try to create from job descriptions
  if (items.length === 0) {
    const job = await getJobCard(jobId);
    if (job && job.jobDescriptions.length > 0) {
      await createJobItemsFromJobDescriptions(jobId, job.jobDescriptions);
      items = await getJobItemsByJob(jobId);
    }
  }
  
  return items;
}

