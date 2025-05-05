/**
 * API utilities
 */

// Get the base URL from environment or use localhost as fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Builds an API URL correctly handling the path
 * It prevents the '/api' duplication issue when the base URL already includes '/api'
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
 * Cache control headers to prevent 304 Not Modified responses
 */
export const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

/**
 * Makes a fetch request with cache control headers
 */
export async function fetchWithNoCache(url: string, options: RequestInit = {}) {
  const headers = {
    ...options.headers,
    ...noCacheHeaders
  };
  
  return fetch(url, {
    ...options,
    headers,
    cache: 'no-store'
  });
}

export default {
  buildApiUrl,
  noCacheHeaders,
  fetchWithNoCache
}; 