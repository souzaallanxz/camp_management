/**
 * API Service - Gerencia todas as chamadas de API do aplicativo
 */
import { toast } from 'sonner';

// Get API URL from environment variable or use fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Standardized API paths to ensure consistency
 */
export const API_PATHS = {
  // Auth
  AUTH_ME: '/auth/me',
  AUTH_SIGN_IN: '/auth/sign-in',
  AUTH_SIGN_UP: '/auth/sign-up',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_VERIFY_OTP: '/auth/verify-otp',
  
  // Teams
  TEAMS_CURRENT: '/teams/current',
  TEAMS_LIST: '/teams',
  TEAMS_CREATE: '/teams',
  TEAMS_UPDATE: '/teams',
  TEAMS_DELETE: '/teams',
  
  // Settings
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ORGANIZATION: '/settings/organization',

  // Dashboard
  DASHBOARD_MONTHLY_PAYMENTS: '/dashboard/monthly-payments',
  DASHBOARD_MONTHLY_REGISTRATIONS: '/dashboard/monthly-registrations',
  DASHBOARD_RECENT_PAYMENTS: '/dashboard/recent-payments',
  DASHBOARD_REGISTRATION_STATUS: '/dashboard/registration-status',
  
  // Camps
  CAMPS_LIST: '/camps',
  CAMPS_CREATE: '/camps',
  CAMPS_GET: '/camps',
  CAMPS_UPDATE: '/camps',
  CAMPS_DELETE: '/camps',
  
  // Registrations
  REGISTRATIONS_LIST: '/registrations',
  REGISTRATIONS_CREATE: '/registrations',
  REGISTRATIONS_GET: '/registrations',
  REGISTRATIONS_UPDATE: '/registrations',
  REGISTRATIONS_DELETE: '/registrations',
  
  // Payments
  PAYMENTS_LIST: '/payments',
  PAYMENTS_CREATE: '/payments',
  PAYMENTS_GET: '/payments',
  PAYMENTS_UPDATE: '/payments',
  PAYMENTS_DELETE: '/payments',
};

/**
 * Cache control headers to prevent 304 Not Modified responses
 */
export const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

/**
 * Builds an API URL with the correct path format
 */
export function buildApiUrl(path: string): string {
  // Ensure path starts with '/' if not empty
  if (path && !path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Remove any leading '/api' from the path if present
  const cleanPath = path.startsWith('/api/') ? path.substring(4) : path;
  
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Get authorization headers with token
 */
export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Get team ID header if available
 */
export function getTeamHeaders() {
  const teamId = localStorage.getItem('team_id');
  if (!teamId) return {};
  
  return {
    'x-team-id': teamId
  };
}

/**
 * API request options interface
 */
interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
  requireTeam?: boolean;
  handleError?: boolean;
}

/**
 * Makes a fetch request with proper headers and error handling
 */
export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { 
    requireAuth = false, 
    requireTeam = false, 
    handleError = true,
    headers = {},
    ...restOptions 
  } = options;
  
  // Build headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...noCacheHeaders,
    ...headers
  };
  
  // Add auth header if required
  if (requireAuth) {
    const authHeaders = getAuthHeaders();
    Object.assign(requestHeaders, authHeaders);
    
    // Check if we have auth headers when required
    if (requireAuth && !requestHeaders['Authorization']) {
      throw new Error('Authentication required');
    }
  }
  
  // Add team header if required
  if (requireTeam) {
    const teamHeaders = getTeamHeaders();
    Object.assign(requestHeaders, teamHeaders);
    
    // Check if we have team header when required
    if (requireTeam && !requestHeaders['x-team-id']) {
      throw new Error('Team ID required');
    }
  }
  
  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      cache: 'no-store'
    });
    
    // Handle non-success responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || `Error: ${response.status}`;
      
      if (handleError) {
        // Handle common error codes
        if (response.status === 401) {
          // Unauthorized, clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('team_id');
          window.location.href = '/sign-in';
          throw new Error('Session expired. Please sign in again.');
        }
        
        // Show toast notification for other errors
        toast.error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse response
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  } catch (error) {
    if (handleError) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
    }
    throw error;
  }
}

/**
 * API helper methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(path: string, options?: ApiRequestOptions) => 
    apiRequest<T>(buildApiUrl(path), { method: 'GET', ...options }),
    
  post: <T = any>(path: string, data: any, options?: ApiRequestOptions) => 
    apiRequest<T>(buildApiUrl(path), { method: 'POST', body: JSON.stringify(data), ...options }),
    
  put: <T = any>(path: string, data: any, options?: ApiRequestOptions) => 
    apiRequest<T>(buildApiUrl(path), { method: 'PUT', body: JSON.stringify(data), ...options }),
    
  patch: <T = any>(path: string, data: any, options?: ApiRequestOptions) => 
    apiRequest<T>(buildApiUrl(path), { method: 'PATCH', body: JSON.stringify(data), ...options }),
    
  delete: <T = any>(path: string, options?: ApiRequestOptions) => 
    apiRequest<T>(buildApiUrl(path), { method: 'DELETE', ...options }),
    
  // Utility methods
  buildUrl: buildApiUrl,
};

export default api; 