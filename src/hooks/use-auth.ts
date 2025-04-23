import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getCurrentUser, onAuthStateChange } from '@/features/auth/auth-service'

export function useAuth() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser()
      } catch {
        navigate({ to: '/sign-in' })
      }
    }

    checkAuth()

    const unsubscribe = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate({ to: '/sign-in' })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [navigate])
} 