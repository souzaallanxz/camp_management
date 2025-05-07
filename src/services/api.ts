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
  
  // For production, we want to use the same domain
  if (import.meta.env.PROD) {
    return path;
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
 * Builds a URL specifically for team endpoints, which may have different issues
 * with routing in some environments
 */
export function buildTeamApiUrl(): string {
  // For production, use a safe, absolute path that won't redirect to HTML
  if (import.meta.env.PROD) {
    // Use an explicit API path
    return '/api/teams/current';
  }
  
  // For development, use the normal URL building
  return buildApiUrl('/teams/current');
}

export default {
  buildApiUrl,
  buildTeamApiUrl
}; 