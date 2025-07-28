import { useMemo } from 'react'
import { useCurrentTeam } from './use-current-team'
import { useUser } from '@/features/auth/hooks/use-user'
import { getFeaturePermissions, type FeaturePermissions } from '../utils/feature-permissions'

export function useTeamPermissions(): FeaturePermissions & { isLoading: boolean } {
  const { data: team, isLoading: teamLoading } = useCurrentTeam()
  const { role, isLoading: userLoading } = useUser()
  
  // Memoize permissions to prevent unnecessary recalculations
  const permissions = useMemo(() => {
    // Se ainda está carregando as informações do usuário, 
    // retorna permissões restritivas para evitar mostrar conteúdo incorreto
    if (userLoading) {
      return {
        dashboard: {
          viewPaymentsTotal: false,
          viewRegistrationsTotal: false,
          viewCamperTotal: false,
          viewRechargesTotal: false,
          viewOverview: false,
          viewLatestRegistrations: false,
        },
        registrations: {
          viewList: false,
          create: false,
          startOnboarding: false,
          delete: false,
        },
        campers: {
          viewList: false,
          create: false,
          rechargeCard: false,
        },
        camps: {
          viewList: false,
          create: false,
        },
        snackBar: {
          access: false,
        },
        staff: {
          viewList: false,
          create: false,
          rechargeCard: false,
        },
      }
    }
    
    return getFeaturePermissions(team?.tier ?? 'free', role)
  }, [team?.tier, role, userLoading])
  
  return {
    isLoading: teamLoading || userLoading,
    ...permissions
  }
} 