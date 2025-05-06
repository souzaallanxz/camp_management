import type { SignInCredentials, SignUpCredentials } from './types'
import { api, API_PATHS } from '@/services/api'

export type User = {
  id: string
  email: string
  name: string
  team_id: string | null
  created_at: string
  updated_at: string
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
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_SIGN_IN,
      credentials
    );
    
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    
    return { error: null, user: response.user };
  } catch {
    return { error: 'Invalid credentials', user: null };
  }
}

export function signOut() {
  localStorage.removeItem('token');
  localStorage.removeItem('teamId');
  window.location.href = '/auth/sign-in';
}

export async function getCurrentUser() {
  try {
    return await api.get<User>(API_PATHS.AUTH_ME);
  } catch {
    return null;
  }
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
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_SIGN_UP,
      credentials
    );
    
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    
    return { error: null, user: response.user };
  } catch {
    return { error: 'Failed to create account', user: null };
  }
}

export async function setupPassword(userId: string, password: string) {
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_SETUP_PASSWORD,
      { userId, password }
    );

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response.user;
  } catch {
    throw new Error('Failed to setup password');
  }
}

export async function verifyOtp(email: string, otp: string) {
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_VERIFY_OTP,
      { email, otp }
    );

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response.user;
  } catch {
    throw new Error('Failed to verify OTP');
  }
}

export async function forgotPassword(email: string) {
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_FORGOT_PASSWORD,
      { email }
    );

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response.user;
  } catch {
    throw new Error('Failed to send password reset email');
  }
}

export async function resetPassword(token: string, password: string) {
  try {
    const response = await api.post<{ token: string; user: User }>(
      API_PATHS.AUTH_RESET_PASSWORD,
      { token, password }
    );

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    return response.user;
  } catch {
    throw new Error('Failed to reset password');
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