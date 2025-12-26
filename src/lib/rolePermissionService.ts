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
import { RolePermission } from './types';
import { getPermission } from './permissionService';
import { Permission } from './types';

const ROLE_PERMISSIONS_COLLECTION = 'role_permissions';

/**
 * Get role-permission by ID
 */
export async function getRolePermission(rolePermissionId: string): Promise<RolePermission | null> {
  const rolePermissionRef = doc(db, ROLE_PERMISSIONS_COLLECTION, rolePermissionId);
  const rolePermissionSnap = await getDoc(rolePermissionRef);
  
  if (!rolePermissionSnap.exists()) {
    return null;
  }
  
  const data = rolePermissionSnap.data();
  return {
    id: rolePermissionSnap.id,
    roleId: data.roleId,
    permissionId: data.permissionId,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * Get all permissions for a role
 */
export async function getPermissionsByRole(roleId: string): Promise<Permission[]> {
  const rolePermissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
  const q = query(rolePermissionsRef, where('roleId', '==', roleId));
  const querySnapshot = await getDocs(q);
  
  const permissions: Permission[] = [];
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    const permission = await getPermission(data.permissionId);
    if (permission) {
      permissions.push(permission.name);
    }
  }
  
  return permissions;
}

/**
 * Get all role-permission mappings
 */
export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const rolePermissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
  const querySnapshot = await getDocs(rolePermissionsRef);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      roleId: data.roleId,
      permissionId: data.permissionId,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get all permissions for multiple roles
 */
export async function getPermissionsByRoles(roleIds: string[]): Promise<Permission[]> {
  if (roleIds.length === 0) {
    return [];
  }
  
  const rolePermissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
  const permissionsMap = new Set<Permission>();
  
  // Firestore 'in' query supports up to 10 items
  const batchSize = 10;
  for (let i = 0; i < roleIds.length; i += batchSize) {
    const batch = roleIds.slice(i, i + batchSize);
    const q = query(rolePermissionsRef, where('roleId', 'in', batch));
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const permission = await getPermission(data.permissionId);
      if (permission) {
        permissionsMap.add(permission.name);
      }
    }
  }
  
  return Array.from(permissionsMap);
}

/**
 * Create a role-permission mapping
 */
export async function createRolePermission(roleId: string, permissionId: string): Promise<string> {
  // Check if mapping already exists
  const rolePermissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
  const q = query(
    rolePermissionsRef,
    where('roleId', '==', roleId),
    where('permissionId', '==', permissionId)
  );
  const existing = await getDocs(q);
  
  if (!existing.empty) {
    throw new Error('Role-permission mapping already exists');
  }

  const rolePermissionRef = doc(collection(db, ROLE_PERMISSIONS_COLLECTION));
  await setDoc(rolePermissionRef, {
    roleId,
    permissionId,
    createdAt: serverTimestamp(),
  });
  
  return rolePermissionRef.id;
}

/**
 * Delete a role-permission mapping
 */
export async function deleteRolePermission(rolePermissionId: string): Promise<void> {
  const rolePermissionRef = doc(db, ROLE_PERMISSIONS_COLLECTION, rolePermissionId);
  await deleteDoc(rolePermissionRef);
}

