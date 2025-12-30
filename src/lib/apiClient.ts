/**
 * API Client for making HTTP requests
 */

// In Vite, use import.meta.env instead of process.env
// Environment variables must be prefixed with VITE_
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Only log warning in browser environment to avoid server-side noise
// The actual validation happens when making API requests

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
}

export interface LoginRequest {
  emailId: string;
  password: string;
}

export interface CompanyInfo {
  companyId: string;
  companyName: string;
  gstIn: string;
  createdOn: string;
  updatedOn: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  emailId: string;
  userType: string;
  companyId: CompanyInfo;
  roleId?: string; // Optional role ID from login response
}

export interface UserRoleResponseItem {
  userRoleId: string;
  userId: {
    userId: string;
    emailId: string;
    companyId: any;
    userType: string;
    createdOn: string;
    updatedOn: string;
  };
  roleId: {
    roleId: string;
    roleName: string;
    createdOn: string;
    updatedOn: string;
  };
  createdOn: string;
  updatedOn: string;
}

export type UserRoleResponse = UserRoleResponseItem[];

export interface RolePermissionResponse {
  roleId: string;
  roleName?: string;
  permissions: Array<{
    permissionId: string;
    permissionName: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Get the stored authentication token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Set the authentication token
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

/**
 * Remove the authentication token
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * Make an API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Validate API_BASE_URL is set
  if (!API_BASE_URL || API_BASE_URL.trim() === '') {
    const error: ApiError = {
      message: 'API base URL is not configured. Please set VITE_API_BASE_URL in your .env.local file.',
      status: 0,
    };
    throw error;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Remove trailing slash from API_BASE_URL if present
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${baseUrl}${normalizedEndpoint}`;
  
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('API Request:', {
      method: options.method || 'GET',
      url,
      baseUrl,
      endpoint: normalizedEndpoint,
    });
  }
  
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Try to parse JSON, but handle non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        // If it's not JSON, use the text as the error message
        data = { message: text || 'An error occurred' };
      }
    }

    if (!response.ok) {
      const error: ApiError = {
        message: data.message || data.error || response.statusText || `Request failed with status ${response.status}`,
        status: response.status,
        statusText: response.statusText,
      };
      
      // Enhanced error logging for 404
      if (response.status === 404) {
        console.error('❌ 404 Not Found:', {
          url,
          status: response.status,
          message: error.message,
        });
        console.error('💡 Check that:');
        console.error('   1. VITE_API_BASE_URL is set correctly in .env.local');
        console.error('   2. The API endpoint path is correct');
        console.error('   3. The API server is running and accessible');
      }
      
      throw error;
    }

    return data;
  } catch (error: any) {
    if (error.status) {
      // Already formatted API error
      throw error;
    }
    // Network or other error
    throw {
      message: error.message || 'Network error. Please check your connection.',
    } as ApiError;
  }
}

/**
 * Login API call
 */
export async function loginApi(
  emailId: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailId, password }),
  });

  // Store token if provided
  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

/**
 * Get user roles for a user
 * API Endpoint: GET {{api_base}}/user-roles/user/{{userId}}
 */
export async function getUserRoles(userId: string): Promise<UserRoleResponse> {
  if (!userId || userId.trim() === '') {
    throw new Error('userId is required to fetch user roles');
  }
  
  if (import.meta.env.DEV) {
    console.log('Fetching user roles for userId:', userId);
  }
  
  return await apiRequest<UserRoleResponse>(`/user-roles/user/${userId}`, {
    method: 'GET',
  });
}

/**
 * Get role permissions for a role
 * API Endpoint: GET {{api_base}}/role-permissions/role/{{roleId}}
 */
export async function getRolePermissions(roleId: string): Promise<RolePermissionResponse> {
  if (!roleId || roleId.trim() === '') {
    throw new Error('roleId is required to fetch role permissions');
  }
  
  if (import.meta.env.DEV) {
    console.log('Fetching role permissions for roleId:', roleId);
  }
  
  return await apiRequest<RolePermissionResponse>(`/role-permissions/role/${roleId}`, {
    method: 'GET',
  });
}

/**
 * Create a new job
 * API Endpoint: POST {{api_base}}/jobs
 */
export async function createJobApi(jobData: any): Promise<any> {
  if (import.meta.env.DEV) {
    console.log('📤 Creating job via API:', jobData);
    console.log('📤 API Endpoint: POST /jobs');
  }
  
  try {
    const response = await apiRequest<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
    
    if (import.meta.env.DEV) {
      console.log('✅ Job API response received:', response);
    }
    
    return response;
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('❌ Job API error:', error);
    }
    throw error;
  }
}

/**
 * Update job by jobCardId
 * API Endpoint: PUT {{api_base}}/jobs/{jobCardId}
 */
export async function updateJobApi(jobCardId: string, jobData: any): Promise<any> {
  if (import.meta.env.DEV) {
    console.log('📤 Updating job via API:', jobData);
    console.log('📤 API Endpoint: PUT /jobs/' + jobCardId);
  }
  
  try {
    const response = await apiRequest<any>(`/jobs/${jobCardId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
    
    if (import.meta.env.DEV) {
      console.log('✅ Job update API response received:', response);
    }
    
    return response;
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('❌ Job update API error:', error);
    }
    throw error;
  }
}

/**
 * Get jobs by company ID
 * API Endpoint: GET {{api_base}}/jobs/company/{companyId}
 */
export async function getJobsByCompanyId(companyId: string): Promise<any[]> {
  if (import.meta.env.DEV) {
    console.log('📤 Fetching jobs by company ID:', companyId);
    console.log('📤 API Endpoint: GET /jobs/company/' + companyId);
  }

  try {
    const response = await apiRequest<any[]>(`/jobs/company/${companyId}`, {
      method: 'GET',
    });

    if (import.meta.env.DEV) {
      console.log('✅ Jobs API response received:', response);
    }

    return Array.isArray(response) ? response : [];
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('❌ Jobs API error:', error);
    }
    throw error;
  }
}

/**
 * Logout API call (optional - can be used if backend requires logout endpoint)
 */
export async function logoutApi(): Promise<void> {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    // Ignore logout errors, still remove token
    console.error('Logout API error:', error);
  } finally {
    removeAuthToken();
  }
}

