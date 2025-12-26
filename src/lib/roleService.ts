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
import { Role, UserRole } from './types';

const ROLES_COLLECTION = 'roles';

/**
 * Get role by ID
 */
export async function getRole(roleId: string): Promise<Role | null> {
  const roleRef = doc(db, ROLES_COLLECTION, roleId);
  const roleSnap = await getDoc(roleRef);
  
  if (!roleSnap.exists()) {
    return null;
  }
  
  const data = roleSnap.data();
  return {
    id: roleSnap.id,
    name: data.name as UserRole,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: UserRole): Promise<Role | null> {
  const rolesRef = collection(db, ROLES_COLLECTION);
  const q = query(rolesRef, where('name', '==', roleName));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name as UserRole,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const rolesRef = collection(db, ROLES_COLLECTION);
  const q = query(rolesRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as UserRole,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get role by key (alias for getRoleByName for consistency)
 */
export async function getRoleByKey(roleKey: UserRole): Promise<Role | null> {
  return getRoleByName(roleKey);
}

/**
 * Create a new role
 */
export async function createRole(roleName: UserRole): Promise<string> {
  // Check if role already exists
  const existing = await getRoleByName(roleName);
  if (existing) {
    throw new Error(`Role ${roleName} already exists`);
  }

  const roleRef = doc(collection(db, ROLES_COLLECTION));
  await setDoc(roleRef, {
    name: roleName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return roleRef.id;
}

