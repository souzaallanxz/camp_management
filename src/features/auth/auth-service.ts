import type { SignInCredentials, SignUpCredentials } from './types'
import { buildApiUrl } from '@/services/api'

export type User = {
  id: string
  email: string
  name?: string
  team_id?: string | null
  role?: 'superadmin' | 'admin' | 'contributor' | 'cashier' | 'manager'
}

export type Session = {
  user: User
  token: string
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'

// Cache for current user to prevent unnecessary API calls
let userCache: { data: User; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function signIn(credentials: SignInCredentials) {
  const response = await fetch(buildApiUrl('/api/auth/sign-in'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to sign in')
  }

  const data = await response.json()
  
  // Clear cache when user signs in
  userCache = null
  
  return data
}

export async function signOut() {
  // Clear local storage and cache
  localStorage.removeItem('token')
  userCache = null
  return { error: null }
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('No token found')
  }

  // Check if we have valid cached data
  if (userCache && (Date.now() - userCache.timestamp) < CACHE_DURATION) {
    return userCache.data
  }

  try {
    const response = await fetch(buildApiUrl('/api/auth/me'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get current user')
    }

    const userData = await response.json()
    
    // Update cache
    userCache = { data: userData, timestamp: Date.now() }
    
    return userData
  } catch (error) {
    // Clear cache on error
    userCache = null
    
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get current user')
  }
}

// Function to clear user cache (call this when user data might have changed)
export function clearUserCache() {
  userCache = null
}

export async function getCurrentUserTeam(): Promise<string | null> {
  const token = localStorage.getItem('token')
  if (!token) return null

  const response = await fetch(buildApiUrl('/api/teams/current'), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.team?.id || null
}

// Get current user profile
export async function getCurrentUserProfile() {
  const token = localStorage.getItem('token')
  if (!token) return null

  const response = await fetch(buildApiUrl('/api/auth/profile'), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })

  if (!response.ok) return null

  return await response.json()
}

// Update current user profile
export async function updateCurrentUserProfile(profileData: { name: string; language?: string; theme?: string }) {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('No token found')

  const response = await fetch(buildApiUrl('/api/auth/profile'), {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update profile')
  }

  const result = await response.json()
  
  // Clear cache when profile is updated
  clearUserCache()
  
  return result
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  // In a real app, you'd set up event listeners for auth state changes
  // For now, we're not implementing real-time updates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _callback = callback // Store callback to avoid linter error
  return () => {
    // Cleanup function
  }
}

export async function signUp({ email, password, name }: SignUpCredentials) {
  const response = await fetch(buildApiUrl('/api/auth/sign-up'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to sign up')
  }

  const result = await response.json()
  
  // Clear cache when user signs up
  userCache = null
  
  return result
}

export async function forgotPassword(email: string) {
  const response = await fetch(buildApiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send password reset email')
  }

  return response.json()
}

export async function resetPassword(token: string, password: string) {
  const response = await fetch(buildApiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reset password')
  }

  return response.json()
}

// Helper function for debugging team ID
export async function logCurrentUserTeamId() {
  try {
    const user = await getCurrentUser()
    return user.team_id
  } catch {
    return null
  }
} 