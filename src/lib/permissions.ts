import { Permission } from './types';

// Permission constants
export const PERMISSIONS = {
  INVENTORY_MANAGEMENT: 'INVENTORY_MANAGEMENT' as Permission,
  JOB_CARD_MANAGEMENT: 'JOB_CARD_MANAGEMENT' as Permission,
  INVOICE_MANAGEMENT: 'INVOICE_MANAGEMENT' as Permission,
  USER_MANAGEMENT: 'USER_MANAGEMENT' as Permission,
  ROLE_MANAGEMENT: 'ROLE_MANAGEMENT' as Permission,
  PERMISSION_MANAGEMENT: 'PERMISSION_MANAGEMENT' as Permission,
  COMPANY_MANAGEMENT: 'COMPANY_MANAGEMENT' as Permission,
  SUPPLIER_MANAGEMENT: 'SUPPLIER_MANAGEMENT' as Permission,
  PURCHASE_ORDER_MANAGEMENT: 'PURCHASE_ORDER_MANAGEMENT' as Permission,
  VIEW_DASHBOARD: 'VIEW_DASHBOARD' as Permission,
} as const;

export const PERMISSION_DISPLAY_NAMES: Record<Permission, string> = {
  INVENTORY_MANAGEMENT: 'Inventory Management',
  JOB_CARD_MANAGEMENT: 'Job Card Management',
  INVOICE_MANAGEMENT: 'Invoice Management',
  USER_MANAGEMENT: 'User Management',
  ROLE_MANAGEMENT: 'Role Management',
  PERMISSION_MANAGEMENT: 'Permission Management',
  COMPANY_MANAGEMENT: 'Company Management',
  SUPPLIER_MANAGEMENT: 'Supplier Management',
  PURCHASE_ORDER_MANAGEMENT: 'Purchase Order Management',
  VIEW_DASHBOARD: 'View Dashboard',
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  permissionName: Permission
): boolean {
  return userPermissions.includes(permissionName);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  permissionNames: Permission[]
): boolean {
  return permissionNames.some(permission => userPermissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  permissionNames: Permission[]
): boolean {
  return permissionNames.every(permission => userPermissions.includes(permission));
}

/**
 * Get display name for a permission
 */
export function getPermissionDisplayName(permission: Permission): string {
  return PERMISSION_DISPLAY_NAMES[permission];
}

