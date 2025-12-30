import { UserRole } from './types';

export const USER_ROLES: UserRole[] = [
  'ADMIN',
  'SERVICE_ADVISOR',
  'INVENTORY_MANAGER',
  'MECHANIC',
  'ACCOUNTANT',
];

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Admin (Owner)',
  SERVICE_ADVISOR: 'Service Advisor',
  INVENTORY_MANAGER: 'Inventory Manager',
  MECHANIC: 'Mechanic',
  ACCOUNTANT: 'Accountant',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'All access',
    'Reports',
    'User management',
  ],
  SERVICE_ADVISOR: [
    'Create/update job cards',
    'Customer communication',
    'Basic reports',
  ],
  INVENTORY_MANAGER: [
    'Add/update stock',
    'Purchase orders',
    'Supplier management',
  ],
  MECHANIC: [
    'Update job status',
    'View assigned jobs',
    'Parts requisition',
  ],
  ACCOUNTANT: [
    'Generate invoices',
    'Payment recording',
    'Financial reports',
  ],
};

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role];
}

export function getRoleDescription(role: UserRole): string[] {
  return ROLE_DESCRIPTIONS[role];
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN';
}





