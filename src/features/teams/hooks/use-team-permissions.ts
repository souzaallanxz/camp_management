import { useCurrentTeam } from './use-current-team'
import { useUser } from '@/features/auth/hooks/use-user'
import { getFeaturePermissions, type FeaturePermissions } from '../utils/feature-permissions'

export function useTeamPermissions(): FeaturePermissions {
  const { data: team } = useCurrentTeam()
  const { role } = useUser()
  const permissions = getFeaturePermissions(team?.tier ?? 'free', role)
  return permissions
} 