/**
 * Centralized API service for making HTTP requests
 */

// Get the base URL from environment or use localhost as fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Standardized API paths to ensure consistency
 */
export const API_PATHS = {
  // Auth
  AUTH_ME: '/auth/me',
  AUTH_SIGN_IN: '/auth/sign-in',
  AUTH_SIGN_UP: '/auth/sign-up',
  
  // Teams
  TEAMS: '/teams',
  TEAMS_CURRENT: '/teams/current',
  TEAM_MEMBERS: (teamId: string) => `/teams/${teamId}/members`,
  TEAM_MEMBER: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}`,
  
  // Users
  USERS: '/users',
  
  // Dashboard
  DASHBOARD_MONTHLY_PAYMENTS: '/dashboard/monthly-payments',
  DASHBOARD_MONTHLY_REGISTRATIONS: '/dashboard/monthly-registrations',
  DASHBOARD_MONTHLY_SNACKBAR: '/dashboard/monthly-snackbar',
  DASHBOARD_YEARLY_CAMPERS: '/dashboard/yearly-campers',
  DASHBOARD_CAMP_PAYMENTS: '/dashboard/camp-payments',
  
  // Settings
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ORGANIZATION: '/settings/organization',
  
  // Snackbar
  SNACKBAR_BALANCE: '/snackbar-balance',
};

/**
 * Default headers for all requests
 */
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Get authentication headers
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Get team ID header
 */
function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  return teamId ? { 'x-team-id': teamId } : {};
}

/**
 * Builds an API URL correctly handling the path
 */
export function buildApiUrl(path: string): string {
  // Ensure path starts with '/' if not empty
  if (path && !path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Check if the API_BASE_URL already ends with '/api'
  if (API_BASE_URL.endsWith('/api')) {
    // If path starts with '/api/', remove the duplicate '/api'
    if (path.startsWith('/api/')) {
      return `${API_BASE_URL}${path.substring(4)}`;
    }
    // Otherwise, just append the path
    return `${API_BASE_URL}${path}`;
  } 
  
  // If API_BASE_URL doesn't end with '/api', ensure the path includes '/api' if needed
  if (!path.startsWith('/api/') && path !== '/api') {
    return `${API_BASE_URL}/api${path}`;
  }
  
  return `${API_BASE_URL}${path}`;
}

/**
 * Standardized fetch function with error handling
 */
async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path);
  const headers = {
    ...defaultHeaders,
    ...getAuthHeaders(),
    ...getTeamIdHeader(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * API service with standardized methods
 */
export const api = {
  // GET request
  get: <T>(path: string, options: RequestInit = {}) => 
    fetchApi<T>(path, { ...options, method: 'GET' }),

  // POST request
  post: <T>(path: string, data: unknown, options: RequestInit = {}) =>
    fetchApi<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // PUT request
  put: <T>(path: string, data: unknown, options: RequestInit = {}) =>
    fetchApi<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // DELETE request
  delete: <T>(path: string, options: RequestInit = {}) =>
    fetchApi<T>(path, { ...options, method: 'DELETE' }),

  // PATCH request
  patch: <T>(path: string, data: unknown, options: RequestInit = {}) =>
    fetchApi<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export default api; 