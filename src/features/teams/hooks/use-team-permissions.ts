import { useCurrentTeam } from './use-current-team'
import { getFeaturePermissions, type FeaturePermissions } from '../utils/feature-permissions'

export function useTeamPermissions(): FeaturePermissions {
  const { data: team } = useCurrentTeam()
  const permissions = getFeaturePermissions(team?.tier ?? 'free')
  return permissions
} 