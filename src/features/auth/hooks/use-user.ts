import { useAuth } from '../auth-context'
import { User } from '../auth-service'

interface UseUserReturn {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  email: string | null
  role?: 'superadmin' | 'admin' | 'contributor' | 'cashier' | 'manager'
}

export function useUser(): UseUserReturn {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  console.log('Auth context user:', user)
  
  return {
    user,
    isAuthenticated,
    isLoading,
    email: user?.email ?? null,
    role: user?.role as UseUserReturn['role']
  }
} 