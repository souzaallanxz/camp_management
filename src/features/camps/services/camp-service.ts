import { db } from '@/lib/db'
import { type Camp, type InsertCamp, type UpdateCamp } from '../data/schema'
import { getCurrentUserTeam } from '@/features/auth/auth-service'

async function findAll() {
  try {
    const teamId = await getCurrentUserTeam()
    
    const { data, error } = await db.query(
      'SELECT * FROM camps WHERE team_id = $1 ORDER BY created_at DESC',
      [teamId]
    )

    if (error) {
      throw new Error(`Error fetching camps: ${error.message}`)
    }

    return data as Camp[]
  } catch (error) {
    if (error instanceof Error && error.message === 'User has no team assigned') {
      return []
    }
    throw error
  }
}

async function create(camp: InsertCamp) {
  const teamId = await getCurrentUserTeam()
  
  const { data, error } = await db.query(
    `INSERT INTO camps (
      name,
      start_date,
      end_date,
      price,
      team_id,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      camp.name,
      camp.start_date,
      camp.end_date,
      camp.price,
      teamId,
      new Date().toISOString(),
      new Date().toISOString()
    ]
  )

  if (error) {
    throw new Error(`Error creating camp: ${error.message}`)
  }

  return data[0] as Camp
}

async function update(id: string, camp: UpdateCamp) {
  const teamId = await getCurrentUserTeam()
  
  // Build the update query dynamically based on provided fields
  const updateFields = []
  const values = []
  let paramCount = 1

  if (camp.name !== undefined) {
    updateFields.push(`name = $${paramCount}`)
    values.push(camp.name)
    paramCount++
  }

  if (camp.start_date !== undefined) {
    updateFields.push(`start_date = $${paramCount}`)
    values.push(camp.start_date)
    paramCount++
  }

  if (camp.end_date !== undefined) {
    updateFields.push(`end_date = $${paramCount}`)
    values.push(camp.end_date)
    paramCount++
  }

  if (camp.price !== undefined) {
    updateFields.push(`price = $${paramCount}`)
    values.push(camp.price)
    paramCount++
  }

  // Add updated_at
  updateFields.push(`updated_at = $${paramCount}`)
  values.push(new Date().toISOString())
  paramCount++

  if (updateFields.length === 0) {
    throw new Error('No fields to update')
  }

  // Add the camp ID and team ID as the last parameters
  values.push(id)
  values.push(teamId)

  const { data, error } = await db.query(
    `UPDATE camps
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount} AND team_id = $${paramCount + 1}
     RETURNING *`,
    values
  )

  if (error) {
    throw new Error(`Error updating camp: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('Camp not found or you do not have permission to update it')
  }

  return data[0] as Camp
}

async function remove(id: string) {
  const teamId = await getCurrentUserTeam()

  // Check if there are any registrations for this camp
  const { data: registrations, error: registrationsError } = await db.query(
    'SELECT id FROM registrations WHERE camp_id = $1 LIMIT 1',
    [id]
  )

  if (registrationsError) {
    throw new Error(`Error checking registrations: ${registrationsError.message}`)
  }

  if (registrations && registrations.length > 0) {
    throw new Error('Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.')
  }

  const { error } = await db.query(
    'DELETE FROM camps WHERE id = $1 AND team_id = $2',
    [id, teamId]
  )

  if (error) {
    throw new Error(`Error deleting camp: ${error.message}`)
  }
}

export const campService = {
  findAll,
  create,
  update,
  remove,
} 