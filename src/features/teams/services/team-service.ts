import { supabase } from '@/lib/supabase'
import type { CreateTeamDto, Team, TeamTier } from '../types'

export interface UpdateTeamData {
  name?: string
  logo_url?: string | null
  tier?: TeamTier
}

export const teamService = {
  async getTeams() {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return teams as Team[]
  },

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
    const { data: team, error } = await supabase
      .rpc('create_team_for_current_user', {
        team_name: dto.name,
        team_tier: dto.tier ?? 'free'
      })
      .single()

    if (error) {
      throw error
    }

    if (!team) {
      throw new Error('Failed to create team: No data returned')
    }

    return team as Team
  },

  async updateTeam(id: string, data: UpdateTeamData) {
    const { data: result, error } = await supabase
      .rpc('update_current_user_team', {
        p_team_id: id,
        team_name: data.name || null,
        team_logo_url: data.logo_url === undefined ? null : data.logo_url,
        team_tier: data.tier || null
      })
      .single()

    if (error) throw error

    return result as Team
  }
} 