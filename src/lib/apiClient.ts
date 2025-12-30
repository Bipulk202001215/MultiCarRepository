/**
 * API Client for making HTTP requests
 */

// In Vite, use import.meta.env instead of process.env
// Environment variables must be prefixed with VITE_
// Support runtime configuration via window.__APP_CONFIG__ (for Docker deployments)
declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_API_BASE_URL?: string;
    };
  }
}

const getApiBaseUrl = (): string => {
  // #region agent log
  if (typeof window !== 'undefined') {
    const hasConfig = !!window.__APP_CONFIG__;
    const hasApiUrl = !!window.__APP_CONFIG__?.VITE_API_BASE_URL;
    const runtimeUrl = window.__APP_CONFIG__?.VITE_API_BASE_URL || '';
    const buildTimeUrl = import.meta.env.VITE_API_BASE_URL || '';
    const configLoaded = !!(window as any).__APP_CONFIG_LOADED__;
    fetch('http://127.0.0.1:7243/ingest/ebfeed60-7d23-44bc-b993-4f136351bb24',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:getApiBaseUrl',message:'API URL resolution',data:{hasConfig,hasApiUrl,runtimeUrl,buildTimeUrl,configLoaded,windowConfig:window.__APP_CONFIG__},timestamp:Date.now(),sessionId:'debug-session',runId:'api-url-check',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion agent log
  
  // Priority 1: Runtime config (from config.js injected at container startup)
  if (typeof window !== 'undefined') {
    // Check if config.js has loaded
    if ((window as any).__APP_CONFIG_LOADED__ && window.__APP_CONFIG__?.VITE_API_BASE_URL) {
      return window.__APP_CONFIG__.VITE_API_BASE_URL;
    }
    // Fallback: check even if not marked as loaded (in case flag isn't set)
    if (window.__APP_CONFIG__?.VITE_API_BASE_URL) {
      return window.__APP_CONFIG__.VITE_API_BASE_URL;
    }
  }
  // Priority 2: Build-time env var (from .env.local during development)
  return import.meta.env.VITE_API_BASE_URL || '';
};

// #region agent log
// Log the resolved API_BASE_URL at module load time
if (typeof window !== 'undefined') {
  const resolvedUrl = getApiBaseUrl();
  fetch('http://127.0.0.1:7243/ingest/ebfeed60-7d23-44bc-b993-4f136351bb24',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:module-init',message:'API_BASE_URL resolved',data:{resolvedUrl,isEmpty:!resolvedUrl||resolvedUrl.trim()===''},timestamp:Date.now(),sessionId:'debug-session',runId:'api-url-check',hypothesisId:'B'})}).catch(()=>{});
}
// #endregion agent log

const API_BASE_URL = getApiBaseUrl();

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
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Re-evaluate API_BASE_URL in case config.js loaded after module initialization
  // Wait a bit if config.js hasn't loaded yet (max 100ms)
  let currentApiUrl = getApiBaseUrl();
  if (!currentApiUrl && typeof window !== 'undefined') {
    // Config.js might not have loaded yet, wait a bit
    for (let i = 0; i < 10 && !currentApiUrl; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      currentApiUrl = getApiBaseUrl();
    }
  }
  
  // #region agent log
  const debugData = {
    endpoint,
    currentApiUrl,
    moduleApiUrl: API_BASE_URL,
    isEmpty: !currentApiUrl || currentApiUrl.trim() === '',
    hasConfig: typeof window !== 'undefined' ? !!window.__APP_CONFIG__ : false,
    configLoaded: typeof window !== 'undefined' ? !!(window as any).__APP_CONFIG_LOADED__ : false,
    windowConfig: typeof window !== 'undefined' ? window.__APP_CONFIG__ : null
  };
  console.log('API Request Debug:', debugData);
  fetch('http://127.0.0.1:7243/ingest/ebfeed60-7d23-44bc-b993-4f136351bb24',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:apiRequest',message:'API request initiated',data:debugData,timestamp:Date.now(),sessionId:'debug-session',runId:'api-request',hypothesisId:'C'})}).catch(()=>{});
  // #endregion agent log
  
  // Validate API_BASE_URL is set
  if (!currentApiUrl || currentApiUrl.trim() === '') {
    // #region agent log
    const debugInfo = {
      endpoint,
      currentApiUrl,
      windowConfig: typeof window !== 'undefined' ? window.__APP_CONFIG__ : null,
      configLoaded: typeof window !== 'undefined' ? !!(window as any).__APP_CONFIG_LOADED__ : false,
      buildTimeUrl: import.meta.env.VITE_API_BASE_URL || ''
    };
    console.error('API URL validation failed:', debugInfo);
    fetch('http://127.0.0.1:7243/ingest/ebfeed60-7d23-44bc-b993-4f136351bb24',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:apiRequest',message:'API URL validation failed',data:debugInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'api-request',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
    const error: ApiError = {
      message: 'API base URL is not configured. Please set VITE_API_BASE_URL in your .env.local file or configure it via Docker environment variable.',
      status: 0,
    };
    throw error;
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Remove trailing slash from API_BASE_URL if present
  const baseUrl = currentApiUrl.endsWith('/') ? currentApiUrl.slice(0, -1) : currentApiUrl;
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

