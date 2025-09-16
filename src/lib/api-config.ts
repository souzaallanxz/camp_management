import { env } from '@/env'

// API Configuration
export const API_CONFIG = {
  // Base URL for API calls
  baseUrl: (() => {
    // If we're not on localhost, use production URL
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://campy.pt/api'
    }
    
    // Development mode (localhost)
    return env.VITE_API_URL || 'http://localhost:3001/api'
  })(),

  // Default headers for all API calls
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  // Get authentication headers
  getAuthHeaders: () => {
    const teamId = localStorage.getItem('teamId')
    const token = localStorage.getItem('token')
    
    if (!teamId) throw new Error('No team ID found')
    if (!token) throw new Error('No authenticated user found')
    
    return {
      'x-team-id': teamId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  },

  // Build API URL with proper path handling
  buildUrl: (path: string): string => {
    // Ensure path starts with '/' if not empty
    if (path && !path.startsWith('/')) {
      path = '/' + path
    }
    
    // Remove duplicate /api if present
    if (path.startsWith('/api/')) {
      path = path.substring(4)
    }
    
    return `${API_CONFIG.baseUrl}${path}`
  }
} 