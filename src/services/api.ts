/**
 * API utilities
 */

// For production, directly use the correct API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://camp-management-1.onrender.com/api';

/**
 * Builds an API URL correctly handling the path
 */
export function buildApiUrl(path: string): string {
  // Ensure path starts with '/' if not empty
  if (path && !path.startsWith('/')) {
    path = '/' + path;
  }
  
  // For development, we'll use the environment variable
  if (import.meta.env.DEV) {
    const devApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    // Check if devApiUrl already ends with '/api'
    if (devApiUrl.endsWith('/api')) {
      // If path starts with '/api/', remove the duplicate '/api'
      if (path.startsWith('/api/')) {
        return `${devApiUrl}${path.substring(4)}`;
      }
      // Otherwise, just append the path
      return `${devApiUrl}${path}`;
    } 
    
    // If devApiUrl doesn't end with '/api', ensure the path includes '/api' if needed
    if (!path.startsWith('/api/') && path !== '/api') {
      return `${devApiUrl}/api${path}`;
    }
    
    return `${devApiUrl}${path}`;
  }
  
  // For production, use our hardcoded URL
  // If path already includes '/api', remove it to prevent duplication
  if (path.startsWith('/api/')) {
    return `${API_BASE_URL}${path.substring(4)}`;
  }
  
  return `${API_BASE_URL}${path}`;
}

/**
 * Builds a URL specifically for team endpoints
 */
export function buildTeamApiUrl(): string {
  // Always return the direct path
  return `${API_BASE_URL}/teams/current`;
}

export default {
  buildApiUrl,
  buildTeamApiUrl
}; 