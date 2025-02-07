import { useCallback, useEffect, useState } from 'react'
import { teamService } from '../services/team-service'
import { toast } from '@/hooks/use-toast'
import type { Team } from '../types'

// Default team data
const defaultTeam: Team = {
  id: '0',
  name: 'Minha Organização',
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export function useTeamData() {
  const [teams, setTeams] = useState<Team[]>([defaultTeam])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true)
      const team = await teamService.getCurrentUserTeam()

      if (team) {
        setTeams([team])
      } else {
        setTeams([defaultTeam])
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados da organização.',
      })
      setTeams([defaultTeam])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return { teams, isLoading, mutate: fetchTeams }
} 