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
  refetchUser: () => Promise<void>
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
      // Clear team cache before signing in to ensure fresh data
      const { teamService } = await import('../teams/services/team-service')
      teamService.clearTeamCache()
      
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
      // Clear team cache before signing up to ensure fresh data
      const { teamService } = await import('../teams/services/team-service')
      teamService.clearTeamCache()
      
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
      
      // Remove token and team data from localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('team_id')
      localStorage.removeItem('teamId')
      
      // Clear team cache to prevent stale data
      const { teamService } = await import('../teams/services/team-service')
      teamService.clearTeamCache()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign out.',
      })
      throw error
    }
  }, [])

  const handleRefetchUser = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refetchUser: handleRefetchUser,
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