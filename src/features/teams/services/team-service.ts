import { supabase } from '@/lib/supabase'
import type { CreateTeamDto, Team } from '../types'

export const teamService = {
  async getCurrentUserTeam() {
    console.log('Getting current user team') // Debug log
    try {
      const { data: team, error } = await supabase
        .rpc('get_current_user_team')
        .single()

      console.log('Get team result:', { team, error }) // Debug log

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No team found') // Debug log
          return null
        }
        console.error('Error getting team:', error) // Debug log
        throw error
      }

      if (!team) {
        console.log('No team data returned') // Debug log
        return null
      }

      return team as Team
    } catch (error) {
      console.error('Unexpected error getting team:', error) // Debug log
      throw error
    }
  },

  async createTeam(dto: CreateTeamDto) {
    console.log('Creating team:', dto) // Debug log
    try {
      const { data: team, error } = await supabase
        .rpc('create_team_for_current_user', {
          team_name: dto.name
        })
        .single()

      console.log('Create team result:', { team, error }) // Debug log

      if (error) {
        console.error('Error creating team:', error) // Debug log
        throw error
      }

      if (!team) {
        console.error('No team data returned after creation') // Debug log
        throw new Error('Failed to create team: No data returned')
      }

      return team as Team
    } catch (error) {
      console.error('Unexpected error creating team:', error) // Debug log
      throw error
    }
  }
} 