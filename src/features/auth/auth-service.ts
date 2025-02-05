import { supabase } from '@/lib/supabase'
import type { SignUpCredentials } from './types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export async function signIn(email: string | { email: string, password: string }, password?: string) {
  try {
    // Handle both object and separate parameters
    const credentials = typeof email === 'object' 
      ? { email: String(email.email), password: String(email.password) }
      : { email: String(email), password: String(password) }

    const { data, error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      throw error
    }

    if (!data.user || !data.session) {
      throw new Error('Sign in failed: Invalid response from server')
    }

    return data
  } catch (error) {
    throw error
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

export async function getCurrentUserTeam() {
  const { data, error } = await supabase.rpc('get_current_user_team')

  if (error) {
    throw error
  }

  if (!data || !data.id) {
    throw new Error('User has no team assigned')
  }

  return data.id
}

export const authService = {
  signIn,
  signOut,
  getCurrentUser,
  getCurrentUserTeam,

  async signUp({ email, password }: SignUpCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }

    return data
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  }
} 