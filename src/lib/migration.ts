import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { getAllUsers } from './userService';
import { createCompany, getCompany } from './companyService';
import { getRoleByName } from './roleService';
import { setUserRoles } from './userRoleService';
import { UserData, UserRole } from './types';

const USERS_COLLECTION = 'users';
const DEFAULT_COMPANY_NAME = 'Default Company';

/**
 * Create a default company for migration
 */
async function createDefaultCompany(): Promise<string> {
  // Check if default company already exists
  const companiesRef = collection(db, 'companies');
  const companiesSnapshot = await getDocs(companiesRef);
  
  // Try to find existing default company
  for (const doc of companiesSnapshot.docs) {
    const data = doc.data();
    if (data.name === DEFAULT_COMPANY_NAME) {
      return doc.id;
    }
  }

  // Create new default company
  const companyId = await createCompany({
    name: DEFAULT_COMPANY_NAME,
    gstin: '00XXXXXXXXXXXXX', // Placeholder GSTIN
    address: 'Default Address',
    phone: '0000000000',
    email: 'default@company.com',
    stateCode: '00',
  });

  return companyId;
}

/**
 * Migrate existing users to new structure
 * - Assigns users to default company
 * - Converts legacy role field to user_roles entries
 */
export async function migrateUsersToNewStructure(): Promise<void> {
  try {
    console.log('Starting user migration...');

    // Ensure seed data is initialized first
    // (This should be called separately before migration)

    // Create or get default company
    const defaultCompanyId = await createDefaultCompany();
    console.log('Default company ID:', defaultCompanyId);

    // Get all users
    const users = await getAllUsers();
    console.log(`Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user already has companyId
        if (user.companyId && user.companyId.trim() !== '') {
          console.log(`User ${user.email} already has companyId, skipping...`);
          skippedCount++;
          continue;
        }

        // Update user with companyId
        const userRef = doc(db, USERS_COLLECTION, user.id);
        await updateDoc(userRef, {
          companyId: defaultCompanyId,
          updatedAt: serverTimestamp(),
        });

        // If user has legacy role, convert it to user_roles entry
        if (user.role) {
          const role = await getRoleByName(user.role);
          if (role) {
            await setUserRoles(user.id, [role.id]);
            console.log(`Migrated user ${user.email} with role ${user.role}`);
          } else {
            console.warn(`Role ${user.role} not found for user ${user.email}`);
          }
        } else {
          console.log(`User ${user.email} has no legacy role`);
        }

        migratedCount++;
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      }
    }

    console.log(`Migration complete! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

/**
 * Run full migration (seed data + user migration)
 * Call this once to set up the system
 */
export async function runFullMigration(): Promise<void> {
  try {
    console.log('Running full migration...');
    
    // Note: Seed data initialization should be called separately
    // as it might need to be run by an admin user
    console.log('Please ensure seed data is initialized before running user migration');
    console.log('You can call initializeSeedData() separately');
    
    // Run user migration
    await migrateUsersToNewStructure();
    
    console.log('Full migration complete!');
  } catch (error) {
    console.error('Error during full migration:', error);
    throw error;
  }
}




