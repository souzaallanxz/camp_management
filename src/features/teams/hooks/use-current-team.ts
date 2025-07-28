import { useMemo } from 'react'
import { useTeam } from '../context/team-context'
import type { Team } from '../types'

interface UseCurrentTeamReturn {
  data: Team | null
  isLoading: boolean
  mutate: () => Promise<void>
}

export function useCurrentTeam(): UseCurrentTeamReturn {
  const teamContext = useTeam()
  
  // Handle the case where useTeam returns a fallback object
  const team = 'team' in teamContext ? teamContext.team : null
  const isLoading = 'isLoading' in teamContext ? teamContext.isLoading : true
  const refetchTeam = 'refetchTeam' in teamContext ? teamContext.refetchTeam : async () => {}

  // Memoize the return value to prevent unnecessary re-renders
  const result = useMemo(() => ({
    data: team,
    isLoading,
    mutate: refetchTeam,
  }), [team, isLoading, refetchTeam])

  return result
} 