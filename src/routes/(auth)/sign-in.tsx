import { createFileRoute } from '@tanstack/react-router'
import SignIn from '@/features/auth/sign-in'

interface SignInSearchParams {
  redirect?: string
}

export const Route = createFileRoute('/(auth)/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearchParams => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : '/',
    }
  },
  component: SignIn,
})
