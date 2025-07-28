import type { CreateTeamDto, Team, TeamTier } from '../types'
import { buildApiUrl, buildTeamApiUrl } from '@/services/api'

export interface UpdateTeamData {
  name?: string
  logo_url?: string | null
  tier?: TeamTier
}

// Cache for team data to prevent unnecessary API calls
let teamCache: { data: Team | null; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const teamService = {
  async getTeams() {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    const response = await fetch(buildApiUrl('/teams'), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch teams')
    }

    return response.json()
  },

  async getCurrentUserTeam(): Promise<Team | null> {
    const token = localStorage.getItem('token')
    if (!token) {
      return null
    }

    // Check if we have valid cached data
    if (teamCache && (Date.now() - teamCache.timestamp) < CACHE_DURATION) {
      return teamCache.data
    }

    try {
      const response = await fetch(buildTeamApiUrl(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        // Clear cache on error
        teamCache = null
        return null
      }

      const teamData = await response.json()
      
      // Update cache
      teamCache = { data: teamData, timestamp: Date.now() }
      
      return teamData
    } catch {
      // Clear cache on error
      teamCache = null
      return null
    }
  },

  async createTeam(data: CreateTeamDto): Promise<Team> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    const response = await fetch(buildApiUrl('/teams'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create team')
    }

    const teamData = await response.json()
    
    // Clear cache when team is created
    teamCache = null
    
    return teamData
  },

  async updateTeam(teamId: string, data: UpdateTeamData): Promise<Team> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    const response = await fetch(buildApiUrl(`/teams/${teamId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update team')
    }

    const teamData = await response.json()
    
    // Clear cache when team is updated
    teamCache = null
    
    return teamData
  },

  // Function to clear team cache (call this when team data might have changed)
  clearTeamCache() {
    teamCache = null
  }
} 