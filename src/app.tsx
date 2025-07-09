import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/features/auth/auth-context'
import { router } from '@/router'
import { CreateTeamRedirect } from '@/features/teams/components/CreateTeamRedirect'

export default function App() {
  return (
    <AuthProvider>
      <CreateTeamRedirect />
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  )
} 