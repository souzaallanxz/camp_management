import { useUser } from '@/features/auth/hooks/use-user'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import React from 'react'

export function AuthAndPermissionsGate({ children }: { children: React.ReactNode }) {
  const { isLoading: userLoading, user } = useUser()
  const permissions = useTeamPermissions()

  if (userLoading || !user || !permissions) {
    return <div>Carregando...</div>
  }

  return <>{children}</>
} 