import axios, { AxiosHeaders } from 'axios'
import { API_CONFIG } from './api-config'

// Helper to check if we have a team ID
export function hasTeamId(): boolean {
  return !!(localStorage.getItem('teamId') || localStorage.getItem('team_id'))
}

// Helper to check if we're properly authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_CONFIG.baseUrl,
  headers: API_CONFIG.defaultHeaders,
  withCredentials: true
})

// Add request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    try {
      const authHeaders = API_CONFIG.getAuthHeaders()
      const headers = new AxiosHeaders(config.headers)
      Object.entries(authHeaders).forEach(([key, value]) => {
        headers.set(key, value)
      })
      config.headers = headers
    } catch {
      // If auth headers can't be added, let the request fail
      // Silent fail - headers will be missing
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Clear auth data and redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('teamId')
          window.location.href = '/sign-in'
          break
        case 403:
          // Handle forbidden access
          // Silent fail - will be handled by the UI
          break
        case 500:
          // Handle server errors
          // Silent fail - will be handled by the UI
          break
      }
    }
    return Promise.reject(error)
  }
) 