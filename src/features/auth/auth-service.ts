import type { SignInCredentials, SignUpCredentials } from './types'
import { buildApiUrl, fetchWithNoCache } from '@/services/api'

export type User = {
  id: string
  email: string
  name?: string
  team_id?: string | null
  role?: string
}

export type Session = {
  user: User
  token: string
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'

export interface AuthResponse {
  user: User
  session: Session
}

export async function signIn(credentials: SignInCredentials) {
  const response = await fetchWithNoCache(buildApiUrl('/auth/sign-in'), {
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

  const response = await fetchWithNoCache(buildApiUrl('/auth/me'), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get current user')
  }

  return response.json()
}

export async function getCurrentUserTeam() {
  try {
    const user = await getCurrentUser()
    return user.team_id || null
  } catch {
    return null
  }
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

export async function signUp(credentials: SignUpCredentials) {
  const response = await fetchWithNoCache(buildApiUrl('/auth/sign-up'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to sign up')
  }

  return response.json()
}

export async function setupPassword(userId: string, password: string) {
  const response = await fetchWithNoCache(buildApiUrl('/auth/setup-password'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Falha ao definir senha')
  }

  return response.json()
}

export async function verifyOtp(email: string, otp: string) {
  const response = await fetchWithNoCache(buildApiUrl('/auth/verify-otp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to verify OTP')
  }

  return response.json()
}

export async function forgotPassword(email: string) {
  const response = await fetchWithNoCache(buildApiUrl('/auth/forgot-password'), {
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
  const response = await fetchWithNoCache(buildApiUrl('/auth/reset-password'), {
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