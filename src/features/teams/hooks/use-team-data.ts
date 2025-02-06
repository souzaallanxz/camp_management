import { useCallback, useEffect, useState } from 'react'
import type { ElementType } from 'react'
import { Command } from 'lucide-react'
import { teamService } from '../services/team-service'
import { toast } from '@/hooks/use-toast'

interface Team {
  id: string
  name: string
  logo: ElementType
  plan: string
}

// Default team data
const defaultTeam: Team = {
  id: '0',
  name: 'Minha Organização',
  logo: Command,
  plan: 'Standard Plan'
}

export function useTeamData() {
  const [teams, setTeams] = useState<Team[]>([defaultTeam])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true)
      const team = await teamService.getCurrentUserTeam()

      if (team) {
        setTeams([{
          id: team.id,
          name: team.name,
          logo: Command,
          plan: 'Standard Plan'
        }])
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