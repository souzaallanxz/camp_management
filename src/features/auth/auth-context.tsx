import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import { User } from './auth-service'
import { signIn, signUp, signOut, getCurrentUser, onAuthStateChange } from './auth-service'
import type { SignInCredentials, SignUpCredentials } from './types'
import { toast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: SignInCredentials) => Promise<void>
  signUp: (credentials: SignUpCredentials) => Promise<{
    user: {
      id: string
      email: string
      name?: string
      team_id?: string | null
    }
    session: {
      user: {
        id: string
        email: string
        name?: string
        team_id?: string | null
      }
      token: string
    }
  }>
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
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        // Salvar team_id no localStorage quando inicializar
        if (currentUser && currentUser.team_id) {
          localStorage.setItem('team_id', currentUser.team_id)
          localStorage.setItem('teamId', currentUser.team_id)
        }
      } catch {
        // User is not authenticated, that's okay
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSignIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      const { session } = await signIn(credentials)
      setUser(session.user)
      
      // Definir o token no localStorage
      localStorage.setItem('token', session.token)
      
      // Definir o team_id no localStorage (em ambos os formatos para compatibilidade)
      if (session.user.team_id) {
        localStorage.setItem('team_id', session.user.team_id)
        localStorage.setItem('teamId', session.user.team_id)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign in.',
      })
      throw error
    }
  }, [])

  const handleSignUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      const response = await signUp(credentials)
      setUser(response.session.user)
      
      // Definir o token no localStorage
      localStorage.setItem('token', response.session.token)
      
      // Definir o team_id no localStorage (em ambos os formatos para compatibilidade)
      if (response.session.user.team_id) {
        localStorage.setItem('team_id', response.session.user.team_id)
        localStorage.setItem('teamId', response.session.user.team_id)
      }
      
      return response
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign up.',
      })
      throw error
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      setUser(null)
      
      // Remove token from localStorage
      localStorage.removeItem('token')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign out.',
      })
      throw error
    }
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  }

  return (
    <AuthContext.Provider value={value}>
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