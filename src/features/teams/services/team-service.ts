import { db } from '@/lib/neon-db'
import type { CreateTeamDto, Team, TeamTier } from '../types'
import { buildApiUrl, buildTeamApiUrl } from '@/services/api'

export interface UpdateTeamData {
  name?: string
  logo_url?: string | null
  tier?: TeamTier
}

interface DbError {
  message: string
}

export const teamService = {
  async getTeams() {
    const { data: teams, error } = await db.query(
      'SELECT * FROM teams ORDER BY created_at DESC'
    )

    if (error) {
      throw new Error(`Error fetching teams: ${(error as DbError).message}`)
    }

    return teams as Team[]
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
        const errorText = await response.text();
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
      } catch (parseError) {
        
        // Se já temos o ID da equipe no localStorage, podemos criar um objeto "simulado"
        const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
        if (teamId) {
          return { id: teamId };
        }
        
        return null;
      }
    } catch (error) {
      
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

    try {
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
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      throw error;
    }
  },

  async updateTeam(id: string, data: UpdateTeamData) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    // Verificar se o usuário está associado a esta equipe
    const { data: userData, error: userError } = await db.query(
      `SELECT team_id FROM users WHERE id = $1::uuid`,
      [token]
    )

    if (userError) {
      throw new Error(`Error checking user data: ${(userError as DbError).message}`)
    }

    if (!userData || userData.length === 0 || userData[0].team_id !== id) {
      throw new Error('User is not associated with this team')
    }

    // Assumimos que o usuário é o proprietário da equipe se ele estiver associado a ela
    // Em uma implementação mais robusta, você pode adicionar um campo 'role' à tabela users
    // para distinguir entre proprietários e membros normais

    // Build the update query dynamically based on provided fields
    const updateFields = []
    const values = []
    let paramCount = 1

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramCount}`)
      values.push(data.name)
      paramCount++
    }

    if (data.logo_url !== undefined) {
      updateFields.push(`logo_url = $${paramCount}`)
      values.push(data.logo_url)
      paramCount++
    }

    if (data.tier !== undefined) {
      updateFields.push(`tier = $${paramCount}`)
      values.push(data.tier)
      paramCount++
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update')
    }

    // Add the team ID as the last parameter
    values.push(id)

    const { data: result, error } = await db.query(
      `UPDATE teams
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    if (error) {
      throw new Error(`Error updating team: ${(error as DbError).message}`)
    }

    if (!result || result.length === 0) {
      throw new Error('Failed to update team: No data returned')
    }

    return result[0] as Team
  }
} 