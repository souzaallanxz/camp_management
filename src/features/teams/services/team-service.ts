import type { CreateTeamDto, Team, TeamTier } from '../types'
import { buildApiUrl, buildTeamApiUrl } from '@/services/api'

export interface UpdateTeamData {
  name?: string
  logo_url?: string | null
  tier?: TeamTier
}

export const teamService = {
  async getTeams() {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    try {
      const response = await fetch(buildApiUrl('/teams'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Error fetching teams: ${response.statusText}`)
      }

      const teams = await response.json()
      return teams as Team[]
    } catch (error) {
      throw new Error(`Error fetching teams: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async getCurrentUserTeam() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authenticated user found');
    }
    
    
    try {
      // Usa a função especial para construir URLs de equipe, evitando problemas de redirecionamento
      const teamUrl = buildTeamApiUrl();
      
      const response = await fetch(teamUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        return null;
      }
      
      // Verificar o Content-Type para garantir que é JSON antes de fazer o parse
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        
        // Se já temos o ID da equipe no localStorage, podemos criar um objeto "simulado"
        const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
        if (teamId) {
          return { id: teamId };
        }
        
        return null;
      }
      
      try {
        const data = await response.json();
        return data;
      } catch {
        // Se já temos o ID da equipe no localStorage, podemos criar um objeto "simulado"
        const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
        if (teamId) {
          return { id: teamId };
        }
        
        return null;
      }
    } catch {
      // Se já temos o ID da equipe no localStorage, podemos criar um objeto "simulado"
      const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
      if (teamId) {
        return { id: teamId };
      }
      
      return null;
    }
  },

  async createTeam(dto: CreateTeamDto) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    // Criar a equipe via API 
    const response = await fetch(buildApiUrl('/teams'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dto),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error creating team: ${errorText}`);
    }
    
    const team = await response.json();
    
    // Salvar o team_id no localStorage
    if (team && team.id) {
      localStorage.setItem('teamId', team.id);
      localStorage.setItem('team_id', team.id);
    }
    
    return team;
  },

  async updateTeam(id: string, data: UpdateTeamData) {
    const token = localStorage.getItem('token')
    const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id')
    
    if (!token) {
      throw new Error('No authenticated user found')
    }
    
    if (!teamId) {
      throw new Error('No team ID found')
    }

    const response = await fetch(buildApiUrl(`/teams/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-team-id': teamId
      },
      body: JSON.stringify(data),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error updating team: ${errorText}`)
    }

    const team = await response.json()
    return team as Team
  }
} 