'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData, createUserDocumentLegacy } from '@/lib/userService';
import { UserRole, UserData, Company, Role, Permission } from '@/lib/types';
import { getCompany } from '@/lib/companyService';
import { getRolesByUser } from '@/lib/userRoleService';
import { getPermissionsByRoles } from '@/lib/rolePermissionService';
import { hasPermission as checkPermission } from '@/lib/permissions';
import { setupSuperAdmin, isSuperAdmin as checkIsSuperAdmin } from '@/lib/superAdminSetup';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  userCompany: Company | null;
  userRoles: Role[];
  userPermissions: Permission[];
  userRole: UserRole | null; // Legacy field for backward compatibility
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isUserAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    // Create user document in Firestore with ADMIN role (legacy)
    // Users who sign up become admins, and only admins can create other users
    // Note: This uses legacy method - new users should be created via admin panel with company
    if (userCredential.user) {
      try {
        await createUserDocumentLegacy(
          userCredential.user.uid,
          email,
          displayName || email.split('@')[0],
          'ADMIN' // Signups become admin
        );
      } catch (error) {
        console.error('Error creating user document:', error);
        // Continue even if Firestore document creation fails
      }
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setUserCompany(null);
    setUserRoles([]);
    setUserPermissions([]);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Initialize super admin on mount (only once)
  useEffect(() => {
    // Setup super admin if it doesn't exist
    setupSuperAdmin().catch(error => {
      console.error('Error setting up super admin:', error);
    });
  }, []);

  // Fetch user data, company, roles, and permissions from Firestore when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Load user data
          const data = await getUserData(user.uid);
          setUserData(data);

          if (data) {
            // Load company if companyId exists
            if (data.companyId) {
              try {
                const company = await getCompany(data.companyId);
                setUserCompany(company);
              } catch (error) {
                console.error('Error fetching company:', error);
                setUserCompany(null);
              }
            } else {
              setUserCompany(null);
            }

            // Load user roles
            try {
              const roles = await getRolesByUser(user.uid);
              setUserRoles(roles);

              // Load permissions based on roles
              if (roles.length > 0) {
                const roleIds = roles.map(r => r.id);
                const permissions = await getPermissionsByRoles(roleIds);
                setUserPermissions(permissions);
              } else {
                setUserPermissions([]);
              }
            } catch (error) {
              console.error('Error fetching user roles/permissions:', error);
              setUserRoles([]);
              setUserPermissions([]);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
          setUserCompany(null);
          setUserRoles([]);
          setUserPermissions([]);
        }
      } else {
        setUserData(null);
        setUserCompany(null);
        setUserRoles([]);
        setUserPermissions([]);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Legacy role field for backward compatibility
  const userRole = userData?.role || null;
  
  // Check if user has ADMIN role (from roles array)
  const isUserAdmin = userRoles.some(role => role.name === 'ADMIN') || userRole === 'ADMIN';

  // Check if user is super admin
  const isSuperAdmin = checkIsSuperAdmin(currentUser?.email || null);

  // Check if user has a specific permission
  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(userPermissions, permission);
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    userCompany,
    userRoles,
    userPermissions,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    isUserAdmin,
    isSuperAdmin,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

