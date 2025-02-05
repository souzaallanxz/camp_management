import { Command } from 'lucide-react'
import { useTeam } from '../context/team-context'

export function useTeamData() {
  const { team } = useTeam()
  return {
    teams: [
      {
        name: team?.name ?? 'No Team',
        logo: Command,
        plan: team ? 'Standard Plan' : 'Free Plan',
      },
    ],
  }
} 