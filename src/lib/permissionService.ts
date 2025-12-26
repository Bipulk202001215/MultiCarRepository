import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { PermissionType, Permission } from './types';

const PERMISSIONS_COLLECTION = 'permissions';

/**
 * Get permission by ID
 */
export async function getPermission(permissionId: string): Promise<PermissionType | null> {
  const permissionRef = doc(db, PERMISSIONS_COLLECTION, permissionId);
  const permissionSnap = await getDoc(permissionRef);
  
  if (!permissionSnap.exists()) {
    return null;
  }
  
  const data = permissionSnap.data();
  return {
    id: permissionSnap.id,
    name: data.name as Permission,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get permission by name
 */
export async function getPermissionByName(permissionName: Permission): Promise<PermissionType | null> {
  const permissionsRef = collection(db, PERMISSIONS_COLLECTION);
  const q = query(permissionsRef, where('name', '==', permissionName));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name as Permission,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all permissions
 */
export async function getAllPermissions(): Promise<PermissionType[]> {
  const permissionsRef = collection(db, PERMISSIONS_COLLECTION);
  const q = query(permissionsRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as Permission,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get permission by key (alias for getPermissionByName for consistency)
 */
export async function getPermissionByKey(permissionKey: Permission): Promise<PermissionType | null> {
  return getPermissionByName(permissionKey);
}

/**
 * Create a new permission
 */
export async function createPermission(permissionName: Permission): Promise<string> {
  // Check if permission already exists
  const existing = await getPermissionByName(permissionName);
  if (existing) {
    throw new Error(`Permission ${permissionName} already exists`);
  }

  const permissionRef = doc(collection(db, PERMISSIONS_COLLECTION));
  await setDoc(permissionRef, {
    name: permissionName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return permissionRef.id;
}

