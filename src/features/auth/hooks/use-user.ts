import { useAuth } from '../auth-context'
import { User } from '../auth-service'

interface UseUserReturn {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  email: string | null
}

export const useUser = (): UseUserReturn => {
  const auth = useAuth()

  if (!auth) {
    throw new Error('useUser must be used within an AuthProvider')
  }

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    email: auth.user?.email || null,
  }
} 