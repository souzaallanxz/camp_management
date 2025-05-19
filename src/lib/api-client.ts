import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
  }
  
  return config
})

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
) 