import { api, API_PATHS } from '@/services/api'
import type { CreateTeamDto, Team, TeamTier } from '../types'

export interface UpdateTeamData {
  name?: string
  tier?: TeamTier
  maxMembers?: number
  maxCamps?: number
  maxRegistrations?: number
}

export const teamService = {
  async getTeams() {
    try {
      return await api.get<Team[]>(API_PATHS.TEAMS)
    } catch {
      return null
    }
  },

  async getCurrentUserTeam() {
    try {
      return await api.get<Team>(API_PATHS.TEAMS_CURRENT)
    } catch {
      return null
    }
  },

  async createTeam(data: CreateTeamDto) {
    try {
      return await api.post<Team>(API_PATHS.TEAMS, data)
    } catch {
      throw new Error('Failed to create team')
    }
  },

  async updateTeam(teamId: string, data: UpdateTeamData) {
    try {
      return await api.put<Team>(`${API_PATHS.TEAMS}/${teamId}`, data)
    } catch {
      throw new Error('Failed to update team')
    }
  },

  async deleteTeam(teamId: string) {
    try {
      await api.delete(`${API_PATHS.TEAMS}/${teamId}`)
    } catch {
      throw new Error('Failed to delete team')
    }
  },

  async addMember(teamId: string, userId: string) {
    try {
      return await api.post<Team>(API_PATHS.TEAM_MEMBERS(teamId), { userId })
    } catch {
      throw new Error('Failed to add team member')
    }
  },

  async removeMember(teamId: string, userId: string) {
    try {
      await api.delete(API_PATHS.TEAM_MEMBER(teamId, userId))
    } catch {
      throw new Error('Failed to remove team member')
    }
  }
} 