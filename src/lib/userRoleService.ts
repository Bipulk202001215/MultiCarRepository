import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRoleJunction, Role } from './types';
import { getRole } from './roleService';

const USER_ROLES_COLLECTION = 'user_roles';

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<string> {
  // Check if assignment already exists
  const existing = await getUserRole(userId, roleId);
  if (existing) {
    return existing.id;
  }
  
  const userRoleRef = doc(collection(db, USER_ROLES_COLLECTION));
  const userRole: Omit<UserRoleJunction, 'id'> = {
    userId,
    roleId,
    createdAt: new Date(),
  };
  
  await setDoc(userRoleRef, {
    ...userRole,
    createdAt: serverTimestamp(),
  });
  
  return userRoleRef.id;
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<void> {
  const userRole = await getUserRole(userId, roleId);
  if (userRole) {
    const userRoleRef = doc(db, USER_ROLES_COLLECTION, userRole.id);
    await deleteDoc(userRoleRef);
  }
}

/**
 * Get user-role junction by userId and roleId
 */
export async function getUserRole(
  userId: string,
  roleId: string
): Promise<UserRoleJunction | null> {
  const userRolesRef = collection(db, USER_ROLES_COLLECTION);
  const q = query(
    userRolesRef,
    where('userId', '==', userId),
    where('roleId', '==', roleId)
  );
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    roleId: data.roleId,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * Get all roles for a user
 */
export async function getRolesByUser(userId: string): Promise<Role[]> {
  const userRolesRef = collection(db, USER_ROLES_COLLECTION);
  const q = query(userRolesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const roles: Role[] = [];
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    const role = await getRole(data.roleId);
    if (role) {
      roles.push(role);
    }
  }
  
  return roles;
}

/**
 * Get all role IDs for a user
 */
export async function getRoleIdsByUser(userId: string): Promise<string[]> {
  const userRolesRef = collection(db, USER_ROLES_COLLECTION);
  const q = query(userRolesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => doc.data().roleId);
}

/**
 * Get all user-role junctions
 */
export async function getAllUserRoles(): Promise<UserRoleJunction[]> {
  const userRolesRef = collection(db, USER_ROLES_COLLECTION);
  const querySnapshot = await getDocs(userRolesRef);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      roleId: data.roleId,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

/**
 * Set user roles (replaces all existing roles)
 */
export async function setUserRoles(
  userId: string,
  roleIds: string[]
): Promise<void> {
  // Get existing roles
  const existingRoleIds = await getRoleIdsByUser(userId);
  
  // Remove roles that are no longer assigned
  for (const roleId of existingRoleIds) {
    if (!roleIds.includes(roleId)) {
      await removeRoleFromUser(userId, roleId);
    }
  }
  
  // Add new roles
  for (const roleId of roleIds) {
    if (!existingRoleIds.includes(roleId)) {
      await assignRoleToUser(userId, roleId);
    }
  }
}

