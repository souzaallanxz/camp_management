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
import { toast } from '@/hooks/use-toast'

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
        setIsLoading(true)
        const currentUser = await authService.getCurrentUser()
        
        setUser(currentUser)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load user information.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      const { user } = await authService.signIn(credentials)
      
      setUser(user)
      toast({
        title: 'Success',
        description: 'Successfully signed in.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign in. Please check your credentials.',
      })
      throw new Error('Failed to sign in')
    }
  }, [])

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      await authService.signUp(credentials)
      toast({
        title: 'Success',
        description: 'Account created successfully.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create account.',
      })
      throw new Error('Failed to create account')
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setUser(null)
      toast({
        title: 'Success',
        description: 'Successfully signed out.',
      })
    } catch (error) {
      // Only show error toast if it's not a missing session error
      if (!(error instanceof Error && error.message.includes('Auth session missing'))) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to sign out.',
        })
        throw error
      }
      // If it was a missing session error, still clear the user state
      setUser(null)
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