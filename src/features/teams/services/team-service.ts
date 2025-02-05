import { supabase } from '@/lib/supabase'
import type { CreateTeamDto, Team } from '../types'

export const teamService = {
  async getCurrentUserTeam() {
    const { data: team, error } = await supabase
      .rpc('get_current_user_team')
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      throw error
    }

    if (!team) {
      return null
    }

    return team as Team
  },

  async createTeam(dto: CreateTeamDto) {
    try {
      const { data: team, error } = await supabase
        .rpc('create_team_for_current_user', {
          team_name: dto.name
        })
        .single()

      if (error) {
        throw error
      }

      if (!team) {
        throw new Error('Failed to create team: No data returned')
      }

      return team as Team
    } catch (error) {
      throw error
    }
  }
} 