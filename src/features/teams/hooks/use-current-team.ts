import { useTeam } from '../context/team-context'
import type { Team } from '../types'

interface UseCurrentTeamReturn {
  data: Team | null
  isLoading: boolean
  mutate: () => Promise<void>
}

export function useCurrentTeam(): UseCurrentTeamReturn {
  const { team, isLoading, refetchTeam } = useTeam()

  return {
    data: team,
    isLoading,
    mutate: refetchTeam,
  }
} 