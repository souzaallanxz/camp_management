import type { SignInCredentials, SignUpCredentials } from './types'
import { API_PATHS, api } from '@/services/api'

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

export type AuthResponse = {
  user: User
  session: Session
}

export type OtpVerificationResponse = {
  user: User
  session: Session
}

export type ResetPasswordResponse = {
  success: boolean
}

export type ForgotPasswordResponse = {
  success: boolean
}

export async function signIn(credentials: SignInCredentials): Promise<AuthResponse> {
  return api.post<AuthResponse>(API_PATHS.AUTH_SIGN_IN, credentials)
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('token')
  localStorage.removeItem('team_id')
  localStorage.removeItem('user')
}

export async function getCurrentUser(): Promise<User> {
  return api.get<User>(API_PATHS.AUTH_ME, { requireAuth: true })
}

export async function storeSession(session: Session): Promise<void> {
  localStorage.setItem('token', session.token)
  if (session.user.team_id) {
    localStorage.setItem('team_id', session.user.team_id)
  }
  localStorage.setItem('user', JSON.stringify(session.user))
}

export function getStoredUser(): User | null {
  const userJson = localStorage.getItem('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export async function signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
  return api.post<AuthResponse>(API_PATHS.AUTH_SIGN_UP, credentials)
}

export async function verifyOtp(email: string, otp: string): Promise<OtpVerificationResponse> {
  return api.post<OtpVerificationResponse>(API_PATHS.AUTH_VERIFY_OTP, { email, otp })
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return api.post<ForgotPasswordResponse>(API_PATHS.AUTH_FORGOT_PASSWORD, { email })
}

export async function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>(API_PATHS.AUTH_RESET_PASSWORD, { token, password })
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

// Helper function for debugging team ID
export async function logCurrentUserTeamId() {
  try {
    const user = await getCurrentUser()
    return user.team_id
  } catch {
    return null
  }
} 