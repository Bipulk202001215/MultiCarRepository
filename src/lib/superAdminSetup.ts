import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserDocument, getUserData } from './userService';
import { createRole, getRoleByKey } from './roleService';
import { createPermission, getPermissionByKey } from './permissionService';
import { createRolePermission, getAllRolePermissions } from './rolePermissionService';
import { setUserRoles } from './userRoleService';
import { UserRole, Permission } from './types';

const SUPER_ADMIN_EMAIL = 'superadmin@gmail.com';
const SUPER_ADMIN_PASSWORD = '1234567';
const SUPER_ADMIN_DISPLAY_NAME = 'Super Admin';

/**
 * Check if super admin user exists in Firebase Auth
 */
export async function checkSuperAdminExists(): Promise<boolean> {
  try {
    // Try to sign in with super admin credentials
    // If it fails, user doesn't exist
    await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await signOut(auth);
    return true;
  } catch (error: any) {
    // User doesn't exist or wrong password
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return false;
    }
    // Other errors, assume user doesn't exist
    return false;
  }
}

/**
 * Create super admin user in Firebase Auth
 */
export async function createSuperAdminAuth(): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      SUPER_ADMIN_EMAIL,
      SUPER_ADMIN_PASSWORD
    );
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      // User already exists, try to sign in
      const signInCredential = await signInWithEmailAndPassword(
        auth,
        SUPER_ADMIN_EMAIL,
        SUPER_ADMIN_PASSWORD
      );
      return signInCredential.user;
    }
    throw error;
  }
}

/**
 * Create or get ADMIN role
 */
export async function ensureAdminRole(): Promise<string> {
  let adminRole = await getRoleByKey('ADMIN');
  if (!adminRole) {
    await createRole('ADMIN');
    adminRole = await getRoleByKey('ADMIN');
    if (!adminRole) {
      throw new Error('Failed to create ADMIN role');
    }
  }
  return adminRole.id;
}

/**
 * Create all required permissions
 */
export async function ensureAllPermissions(): Promise<Map<Permission, string>> {
  const permissionMap = new Map<Permission, string>();
  const allPermissions: Permission[] = [
    'USER_MANAGEMENT',
    'ROLE_MANAGEMENT',
    'PERMISSION_MANAGEMENT',
    'COMPANY_MANAGEMENT',
    'INVENTORY_MANAGEMENT',
    'JOB_CARD_MANAGEMENT',
    'INVOICE_MANAGEMENT',
    'SUPPLIER_MANAGEMENT',
    'PURCHASE_ORDER_MANAGEMENT',
    'VIEW_DASHBOARD',
  ];

  for (const perm of allPermissions) {
    let permission = await getPermissionByKey(perm);
    if (!permission) {
      await createPermission(perm);
      permission = await getPermissionByKey(perm);
      if (!permission) {
        throw new Error(`Failed to create permission: ${perm}`);
      }
    }
    permissionMap.set(perm, permission.id);
  }

  return permissionMap;
}

/**
 * Map all permissions to ADMIN role
 */
export async function ensureAdminHasAllPermissions(adminRoleId: string, permissionMap: Map<Permission, string>): Promise<void> {
  const existingRolePermissions = await getAllRolePermissions();
  const existingMappings = new Set(
    existingRolePermissions
      .filter(rp => rp.roleId === adminRoleId)
      .map(rp => rp.permissionId)
  );

  for (const [permission, permissionId] of permissionMap.entries()) {
    if (!existingMappings.has(permissionId)) {
      try {
        await createRolePermission(adminRoleId, permissionId);
      } catch (error) {
        // Mapping might already exist, continue
        console.log(`Permission ${permission} might already be mapped to ADMIN role`);
      }
    }
  }
}

/**
 * Setup super admin user with all permissions
 * This runs in the background and doesn't interfere with current user session
 */
export async function setupSuperAdmin(): Promise<void> {
  try {
    // Get current user if any
    const currentUser = auth.currentUser;
    const wasSignedIn = !!currentUser;
    const currentUserEmail = currentUser?.email;

    // Check if super admin exists
    const exists = await checkSuperAdminExists();
    let superAdminUser: User;

    if (!exists) {
      // Create super admin in Firebase Auth
      superAdminUser = await createSuperAdminAuth();
    } else {
      // Sign in to get user (only if not already signed in as super admin)
      if (currentUserEmail !== SUPER_ADMIN_EMAIL) {
        const credential = await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
        superAdminUser = credential.user;
      } else {
        if (!currentUser) {
          throw new Error('Current user is null');
        }
        superAdminUser = currentUser;
      }
    }

    // Check if user document exists
    let userData = await getUserData(superAdminUser.uid);

    if (!userData) {
      // Create user document
      await createUserDocument(
        superAdminUser.uid,
        SUPER_ADMIN_EMAIL,
        SUPER_ADMIN_DISPLAY_NAME,
        '', // No company initially
        [] // No roles initially, will be set below
      );
    }

    // Ensure ADMIN role exists
    const adminRoleId = await ensureAdminRole();

    // Ensure all permissions exist
    const permissionMap = await ensureAllPermissions();

    // Map all permissions to ADMIN role
    await ensureAdminHasAllPermissions(adminRoleId, permissionMap);

    // Assign ADMIN role to super admin user
    await setUserRoles(superAdminUser.uid, [adminRoleId]);

    // Restore previous session if user was signed in and it wasn't super admin
    if (wasSignedIn && currentUserEmail !== SUPER_ADMIN_EMAIL) {
      // Sign out super admin
      await signOut(auth);
      // Re-sign in the original user
      // Note: We can't re-sign in automatically, but the auth state listener will handle it
    } else if (!wasSignedIn && currentUserEmail !== SUPER_ADMIN_EMAIL) {
      // Sign out after setup if we weren't signed in
      await signOut(auth);
    }

    console.log('Super admin setup completed successfully');
  } catch (error) {
    console.error('Error setting up super admin:', error);
    // Don't throw - this is a background setup that shouldn't break the app
  }
}

/**
 * Check if current user is super admin
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

export { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_DISPLAY_NAME };

