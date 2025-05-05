import { db } from '@/lib/neon-db'
import type { CreateTeamDto, Team, TeamTier } from '../types'

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
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authenticated user found');
    const response = await fetch(`${API_BASE_URL}/teams/current`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
    });
    if (!response.ok) return null;
    return response.json();
  },

  async createTeam(dto: CreateTeamDto) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No authenticated user found')
    }

    // Start a transaction
    const { error: beginError } = await db.query('BEGIN')
    if (beginError) {
      throw new Error(`Error starting transaction: ${(beginError as DbError).message}`)
    }

    try {
      // Create the team
      const { data: team, error: teamError } = await db.query(
        `INSERT INTO teams (name, tier)
         VALUES ($1, $2)
         RETURNING *`,
        [dto.name, dto.tier ?? 'free']
      )

      if (teamError) {
        throw new Error(`Error creating team: ${(teamError as DbError).message}`)
      }

      if (!team || team.length === 0) {
        throw new Error('Failed to create team: No data returned')
      }

      // Atualizar o team_id do usuário
      const { error: userUpdateError } = await db.query(
        `UPDATE users SET team_id = $1 WHERE id = $2::uuid`,
        [team[0].id, token]
      )

      if (userUpdateError) {
        throw new Error(`Error updating user team_id: ${(userUpdateError as DbError).message}`)
      }

      // Commit the transaction
      const { error: commitError } = await db.query('COMMIT')
      if (commitError) {
        throw new Error(`Error committing transaction: ${(commitError as DbError).message}`)
      }

      return team[0] as Team
    } catch (error) {
      // Rollback the transaction on error
      await db.query('ROLLBACK')
      throw error
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