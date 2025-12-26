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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRole, UserData } from './types';
import { setUserRoles } from './userRoleService';

const USERS_COLLECTION = 'users';

/**
 * Create a user document in Firestore (new version with companyId)
 */
export async function createUserDocument(
  userId: string,
  email: string,
  displayName: string,
  companyId: string,
  roleIds: string[] = []
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, {
    email,
    displayName,
    companyId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Assign roles if provided
  if (roleIds.length > 0) {
    await setUserRoles(userId, roleIds);
  }
}

/**
 * Create a user document in Firestore (legacy version for backward compatibility)
 */
export async function createUserDocumentLegacy(
  userId: string,
  email: string,
  displayName: string,
  role: UserRole
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, {
    email,
    displayName,
    role, // Legacy field
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get user data from Firestore
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  const data = userSnap.data();
  return {
    id: userSnap.id,
    email: data.email,
    displayName: data.displayName,
    companyId: data.companyId || '', // Required field, empty string if not set (legacy users)
    role: data.role as UserRole | undefined, // Legacy field for backward compatibility
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get user role from Firestore (legacy - returns first role or legacy role field)
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const userData = await getUserData(userId);
  // Return legacy role field if exists, otherwise return null
  // Note: New system uses user_roles collection, this is for backward compatibility
  return userData?.role || null;
}

/**
 * Get all users from Firestore
 */
export async function getAllUsers(): Promise<UserData[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const querySnapshot = await getDocs(usersRef);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      companyId: data.companyId || '', // Required field, empty string if not set (legacy users)
      role: data.role as UserRole | undefined, // Legacy field for backward compatibility
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get all users by company ID
 */
export async function getUsersByCompany(companyId: string): Promise<UserData[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where('companyId', '==', companyId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      displayName: data.displayName,
      companyId: data.companyId || '',
      role: data.role as UserRole | undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update user role in Firestore (legacy - for backward compatibility)
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    role, // Legacy field
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user company
 */
export async function updateUserCompany(
  userId: string,
  companyId: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    companyId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user display name in Firestore
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    displayName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete user from Firestore
 */
export async function deleteUserDocument(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await deleteDoc(userRef);
}


