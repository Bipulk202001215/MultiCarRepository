import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserRole, UserData, Company, Role, Permission } from '@/lib/types';
import { loginApi, logoutApi, getAuthToken, removeAuthToken, getUserRoles, getRolePermissions } from '@/lib/apiClient';
import { hasPermission as checkPermission } from '@/lib/permissions';

// Simple user interface based on API response
interface ApiUser {
  id: string;
  email: string;
  displayName?: string;
  userType?: string;
}

interface AuthContextType {
  currentUser: ApiUser | null;
  userData: UserData | null;
  userCompany: Company | null;
  userRoles: Role[];
  userPermissions: Permission[];
  userRole: UserRole | null;
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
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user data from token on mount (page refresh)
  useEffect(() => {
    const loadUserData = async () => {
      const token = getAuthToken();
      if (token) {
        // Load user data from login response stored in localStorage
        const storedUserData = localStorage.getItem('user_data');
        if (storedUserData) {
          try {
            const data = JSON.parse(storedUserData);
            setCurrentUser({
              id: data.userId,
              email: data.emailId,
              displayName: data.emailId?.split('@')[0],
              userType: data.userType,
            });
            
            // Convert API response to UserData format
            if (data.companyId) {
              setUserCompany({
                id: data.companyId.companyId,
                name: data.companyId.companyName,
                gstin: data.companyId.gstIn,
                address: '',
                phone: '',
                email: '',
                stateCode: '',
                createdAt: new Date(data.companyId.createdOn),
                updatedAt: new Date(data.companyId.updatedOn),
              });
              
              setUserData({
                id: data.userId,
                email: data.emailId,
                displayName: data.emailId?.split('@')[0] || '',
                companyId: data.companyId.companyId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Call the same APIs as on login: user-roles and role-permissions
            try {
              // Step 1: Get user roles to extract roleId
              console.log('🔄 [Page Refresh] Step 1: Calling GET /user-roles/user/' + data.userId);
              const userRoleResponse = await getUserRoles(data.userId);
              console.log('✅ [Page Refresh] User roles API response:', userRoleResponse);
              
              // Extract roleId from user-roles response (it's an array, get first item's roleId.roleId)
              if (userRoleResponse && userRoleResponse.length > 0 && userRoleResponse[0].roleId) {
                const roleId = userRoleResponse[0].roleId.roleId;
                console.log('✅ [Page Refresh] Extracted roleId:', roleId);
                
                // Step 2: Get role permissions using the roleId
                console.log('🔄 [Page Refresh] Step 2: Calling GET /role-permissions/role/' + roleId);
                const rolePermissions = await getRolePermissions(roleId);
                console.log('✅ [Page Refresh] Role permissions API response:', rolePermissions);
                
                // Convert API response to Role format
                if (rolePermissions.roleId) {
                  const role: Role = {
                    id: rolePermissions.roleId,
                    name: (rolePermissions.roleName as UserRole) || 'SERVICE_ADVISOR',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  setUserRoles([role]);
                }
                
                // Convert API response permissions to Permission array
                if (rolePermissions.permissions && Array.isArray(rolePermissions.permissions)) {
                  const permissions: Permission[] = rolePermissions.permissions
                    .map((p: any) => p.permissionName as Permission)
                    .filter((p: Permission) => p !== undefined);
                  setUserPermissions(permissions);
                  console.log('✅ [Page Refresh] Successfully set user permissions:', permissions);
                }
              } else {
                console.error('❌ [Page Refresh] roleId not found in user-roles response');
                setUserRoles([]);
                setUserPermissions([]);
              }
            } catch (error: any) {
              console.error('❌ [Page Refresh] Error fetching user roles or role permissions:', error);
              console.error('Error details:', {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
              });
              // Set empty arrays if API call fails
              setUserRoles([]);
              setUserPermissions([]);
            }
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            removeAuthToken();
          }
        }
      }
      setLoading(false);
    };
    
    loadUserData();
  }, []);

  const signup = async (email: string, password: string, displayName?: string) => {
    // TODO: Implement signup API call
    throw new Error('Signup not yet implemented. Please contact administrator.');
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting login for:', email);
      const response = await loginApi(email, password);
      
      // Debug: Log the full login response to see what fields are available
      console.log('✅ Login API response received:', response);
    
    // Store user data in localStorage
    localStorage.setItem('user_data', JSON.stringify(response));
    
    // Set current user from API response
    setCurrentUser({
      id: response.userId,
      email: response.emailId,
      displayName: response.emailId?.split('@')[0],
      userType: response.userType,
    });
    
    // Convert API response to UserData and Company
    if (response.companyId) {
      setUserCompany({
        id: response.companyId.companyId,
        name: response.companyId.companyName,
        gstin: response.companyId.gstIn,
        address: '',
        phone: '',
        email: '',
        stateCode: '',
        createdAt: new Date(response.companyId.createdOn),
        updatedAt: new Date(response.companyId.updatedOn),
      });
      
      setUserData({
        id: response.userId,
        email: response.emailId,
        displayName: response.emailId?.split('@')[0] || '',
        companyId: response.companyId.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    // Set login success flag to true
    const loginSuccess = true;
    console.log('✅ Login successful, flag set to:', loginSuccess);
    
    // Call user-roles API to get roleId, then call role-permissions API
    if (loginSuccess) {
      try {
        // Step 1: Get user roles to extract roleId
        console.log('🔄 Step 1: Calling GET /user-roles/user/' + response.userId);
        const userRoleResponse = await getUserRoles(response.userId);
        console.log('✅ User roles API response:', userRoleResponse);
        
        // Extract roleId from user-roles response (it's an array, get first item's roleId.roleId)
        if (userRoleResponse && userRoleResponse.length > 0 && userRoleResponse[0].roleId) {
          const roleId = userRoleResponse[0].roleId.roleId;
          console.log('✅ Extracted roleId:', roleId);
          
          // Step 2: Get role permissions using the roleId
          console.log('🔄 Step 2: Calling GET /role-permissions/role/' + roleId);
          const rolePermissions = await getRolePermissions(roleId);
          console.log('✅ Role permissions API response:', rolePermissions);
          
          // Convert API response to Role format
          if (rolePermissions.roleId) {
            const role: Role = {
              id: rolePermissions.roleId,
              name: (rolePermissions.roleName as UserRole) || 'SERVICE_ADVISOR',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            setUserRoles([role]);
          }
          
          // Convert API response permissions to Permission array
          if (rolePermissions.permissions && Array.isArray(rolePermissions.permissions)) {
            const permissions: Permission[] = rolePermissions.permissions
              .map((p: any) => p.permissionName as Permission)
              .filter((p: Permission) => p !== undefined);
            setUserPermissions(permissions);
            console.log('✅ Successfully set user permissions:', permissions);
          }
        } else {
          console.error('❌ roleId not found in user-roles response');
          setUserRoles([]);
          setUserPermissions([]);
        }
      } catch (error: any) {
        console.error('❌ Error fetching user roles or role permissions:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
        });
        // Set empty arrays if API call fails
        setUserRoles([]);
        setUserPermissions([]);
      }
    }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
      });
      throw error; // Re-throw to be caught by LoginPage
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout API error:', error);
      removeAuthToken();
    }
    
    localStorage.removeItem('user_data');
    setCurrentUser(null);
    setUserData(null);
    setUserCompany(null);
    setUserRoles([]);
    setUserPermissions([]);
  };

  const resetPassword = async () => {
    // TODO: Implement reset password API call
    throw new Error('Password reset not yet implemented. Please contact administrator.');
  };

  // Legacy role field for backward compatibility
  const userRole = userData?.role || null;
  
  // Check if user has ADMIN role (from roles array)
  const isUserAdmin = userRoles.some(role => role.name === 'ADMIN') || userRole === 'ADMIN';

  // Check if user is super admin (based on email)
  const isSuperAdmin = currentUser?.email === 'superadmin@gmail.com';

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
      {children}
    </AuthContext.Provider>
  );
}
