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
  return data
}

export async function signOut() {
  // Clear local storage
  localStorage.removeItem('token')
  return { error: null }
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('No token found')
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

    return response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get current user')
  }
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

  return await response.json()
}

// Store for auth state change listeners
const authStateListeners: Array<(event: AuthChangeEvent, session: Session | null) => void> = []

// Function to notify all listeners
function notifyAuthStateChange(event: AuthChangeEvent, session: Session | null) {
  authStateListeners.forEach(listener => {
    try {
      listener(event, session)
    } catch {
      // Silently handle errors in auth state change listeners
    }
  })
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  // Add the callback to our listeners
  authStateListeners.push(callback)
  
  // Return cleanup function
  return () => {
    const index = authStateListeners.indexOf(callback)
    if (index > -1) {
      authStateListeners.splice(index, 1)
    }
  }
}

// Export the notify function so it can be called from other parts of the app
export { notifyAuthStateChange }

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

  return response.json()
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