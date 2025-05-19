import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Helper to check if we have a team ID
export function hasTeamId(): boolean {
  return !!(localStorage.getItem('teamId') || localStorage.getItem('team_id'))
}

// Helper to check if we're properly authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to add auth token and team ID
api.interceptors.request.use((config) => {
  // Add Authorization header if token exists
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Add team ID header if it exists
  const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id')
  if (teamId) {
    config.headers['x-team-id'] = teamId
  } else {
    console.warn('Making API request without team ID:', config.url)
  }
  
  return config
})

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    // Handle team ID errors (potentially 401 with specific message)
    if (error.response?.status === 401 && 
        error.response?.data?.error === 'Missing x-team-id header') {
      console.error('Team ID missing in request. Redirecting to select team page.')
      // Could redirect to a "select team" page here
    }
    
    return Promise.reject(error)
  }
) 