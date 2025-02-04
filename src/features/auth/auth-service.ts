import { supabase } from '@/lib/supabase'
import type { SignInCredentials, SignUpCredentials } from './types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export const authService = {
  async signIn({ email, password }: SignInCredentials) {
    console.log('Attempting to sign in:', { email })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error)
      throw error
    }

    console.log('Sign in successful:', data)
    return data
  },

  async signUp({ email, password }: SignUpCredentials) {
    console.log('Attempting to sign up:', { email })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Sign up error:', error)
      throw error
    }

    console.log('Sign up successful:', data)
    return data
  },

  async signOut() {
    console.log('Attempting to sign out')
    try {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No active session found, considering user already signed out')
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      console.log('Sign out successful')
    } catch (error) {
      if (error instanceof Error && error.message.includes('Auth session missing')) {
        console.log('No active session found, considering user already signed out')
        return
      }
      throw error
    }
  },

  async getCurrentUser() {
    console.log('Getting current user session')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
      throw error
    }

    console.log('Current user session:', session)
    return session?.user ?? null
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    console.log('Setting up auth state change listener')
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', { event, session })
      callback(event, session)
    })
  }
} 