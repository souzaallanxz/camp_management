import axios from 'axios'
import { getTeamIdHeader } from './auth'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to add auth token and team id
api.interceptors.request.use((config) => {
  const headers = getTeamIdHeader()
  if (headers['x-team-id']) {
    config.headers['x-team-id'] = headers['x-team-id']
  }
  if (headers.Authorization) {
    config.headers.Authorization = headers.Authorization
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