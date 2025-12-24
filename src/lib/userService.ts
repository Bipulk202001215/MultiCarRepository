import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRole, UserData } from './types';

const USERS_COLLECTION = 'users';

/**
 * Create a user document in Firestore
 */
export async function createUserDocument(
  userId: string,
  email: string,
  displayName: string,
  role: UserRole
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, {
    email,
    displayName,
    role,
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
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Get user role from Firestore
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const userData = await getUserData(userId);
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
      role: data.role as UserRole,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Update user role in Firestore
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    role,
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


