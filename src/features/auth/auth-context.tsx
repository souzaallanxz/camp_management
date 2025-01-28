import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import { User } from '@supabase/supabase-js'
import { authService } from './auth-service'
import type { SignInCredentials, SignUpCredentials } from './types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: SignInCredentials) => Promise<void>
  signUp: (credentials: SignUpCredentials) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      const { user } = await authService.signIn(credentials)
      setUser(user)
      // Success notification can be added later
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }, [])

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      await authService.signUp(credentials)
      // Success notification can be added later
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setUser(null)
      // Success notification can be added later
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 