import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRole, Permission } from './types';

const ROLES_COLLECTION = 'roles';
const PERMISSIONS_COLLECTION = 'permissions';
const ROLE_PERMISSIONS_COLLECTION = 'role_permissions';

/**
 * Seed roles into Firestore
 */
export async function seedRoles(): Promise<Record<UserRole, string>> {
  const roles: UserRole[] = [
    'ADMIN',
    'ACCOUNTANT',
    'MECHANIC',
    'SERVICE_ADVISOR',
    'INVENTORY_MANAGER',
  ];

  const roleIds: Record<UserRole, string> = {} as Record<UserRole, string>;

  for (const roleName of roles) {
    // Check if role already exists
    const rolesRef = collection(db, ROLES_COLLECTION);
    const existingRoles = await getDoc(doc(rolesRef, roleName));
    
    if (!existingRoles.exists()) {
      const roleRef = doc(rolesRef, roleName);
      await setDoc(roleRef, {
        name: roleName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      roleIds[roleName] = roleName; // Using role name as ID
    } else {
      roleIds[roleName] = roleName;
    }
  }

  return roleIds;
}

/**
 * Seed permissions into Firestore
 */
export async function seedPermissions(): Promise<Record<Permission, string>> {
  const permissions: Permission[] = [
    'INVENTORY_MANAGEMENT',
    'JOB_CARD_MANAGEMENT',
    'INVOICE_MANAGEMENT',
  ];

  const permissionIds: Record<Permission, string> = {} as Record<Permission, string>;

  for (const permissionName of permissions) {
    // Check if permission already exists
    const permissionsRef = collection(db, PERMISSIONS_COLLECTION);
    const existingPermission = await getDoc(doc(permissionsRef, permissionName));
    
    if (!existingPermission.exists()) {
      const permissionRef = doc(permissionsRef, permissionName);
      await setDoc(permissionRef, {
        name: permissionName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      permissionIds[permissionName] = permissionName; // Using permission name as ID
    } else {
      permissionIds[permissionName] = permissionName;
    }
  }

  return permissionIds;
}

/**
 * Seed role-permission mappings
 */
export async function seedRolePermissions(
  roleIds: Record<UserRole, string>,
  permissionIds: Record<Permission, string>
): Promise<void> {
  // Define role-permission mappings
  const rolePermissionMappings: Record<UserRole, Permission[]> = {
    ADMIN: ['INVENTORY_MANAGEMENT', 'JOB_CARD_MANAGEMENT', 'INVOICE_MANAGEMENT'],
    ACCOUNTANT: ['INVOICE_MANAGEMENT'],
    SERVICE_ADVISOR: ['JOB_CARD_MANAGEMENT'],
    INVENTORY_MANAGER: ['INVENTORY_MANAGEMENT'],
    MECHANIC: [], // No permissions initially
  };

  for (const [roleName, permissions] of Object.entries(rolePermissionMappings)) {
    const roleId = roleIds[roleName as UserRole];
    
    for (const permissionName of permissions) {
      const permissionId = permissionIds[permissionName as Permission];
      const rolePermissionId = `${roleId}_${permissionId}`;
      
      // Check if mapping already exists
      const rolePermissionRef = doc(db, ROLE_PERMISSIONS_COLLECTION, rolePermissionId);
      const existingMapping = await getDoc(rolePermissionRef);
      
      if (!existingMapping.exists()) {
        await setDoc(rolePermissionRef, {
          roleId,
          permissionId,
          createdAt: serverTimestamp(),
        });
      }
    }
  }
}

/**
 * Initialize all seed data (roles, permissions, role-permissions)
 */
export async function initializeSeedData(): Promise<void> {
  try {
    console.log('Seeding roles...');
    const roleIds = await seedRoles();
    console.log('Roles seeded:', roleIds);

    console.log('Seeding permissions...');
    const permissionIds = await seedPermissions();
    console.log('Permissions seeded:', permissionIds);

    console.log('Seeding role-permission mappings...');
    await seedRolePermissions(roleIds, permissionIds);
    console.log('Role-permission mappings seeded');

    console.log('Seed data initialization complete!');
  } catch (error) {
    console.error('Error initializing seed data:', error);
    throw error;
  }
}

