/**
 * Firebase configuration - TEMPORARY
 * 
 * ⚠️ WARNING: Firebase is included temporarily to prevent import errors while services are being converted to API calls.
 * Once all services (*Service.ts files) are converted to use API endpoints, Firebase should be removed:
 * 
 * 1. Remove firebase from package.json dependencies
 * 2. Delete this file
 * 3. Remove all imports of this file from service files
 * 
 * See MIGRATION_NOTES.md for conversion guide.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Get environment variables (optional - services will fail but imports won't crash)
// In Vite, use import.meta.env.VITE_* instead of process.env.NEXT_PUBLIC_*
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'temp',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'temp',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'temp',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'temp',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'temp',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'temp',
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Export stubs - these won't work but prevent import errors
// Services using these will fail at runtime until converted to API calls
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

