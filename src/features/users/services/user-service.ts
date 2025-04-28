import { User } from '../data/schema'
import { db } from '@/lib/db'
import { getCurrentUserTeam } from '@/features/auth/auth-service'
import { sqlNeon } from '@/lib/sql-neon'
import { emailService } from '@/services/email.service'

// Busca apenas usuários da equipe atual do usuário logado
export async function getUsers(): Promise<User[]> {
  try {
    const teamId = await getCurrentUserTeam();
    
    if (!teamId) {
      return [];
    }
    
    const users = await sqlNeon`
      WITH team_users AS (
        SELECT 
          id,
          first_name as "firstName",
          last_name as "lastName", 
          email,
          status,
          role,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM users
        WHERE team_id = ${teamId}::uuid
      )
      SELECT * FROM team_users
      ORDER BY "createdAt" DESC
    `;
    
    return users || [];
  } catch {
    return [];
  }
}

// Função unificada para criar/convidar usuários
export async function createUserWithInvitation(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'username' | 'phoneNumber'>): Promise<User> {
  const teamId = await getCurrentUserTeam()
  
  if (!teamId) {
    throw new Error('No team associated with current user')
  }
  
  // Set status to 'invited' for new users
  // Role should be passed as is since it's a VARCHAR in database
  const { data, error } = await db
    .from('users')
    .insert({
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      role: userData.role,
      team_id: teamId,
      status: 'invited' // Alterado para 'invited' já que agora vamos enviar emails de convite
    })
    .select(`
      id,
      first_name as firstName,
      last_name as lastName,
      email, 
      status,
      role,
      created_at as createdAt,
      updated_at as updatedAt
    `)
  
  if (error) {
    throw error
  }
  
  // Get the created user
  const user = (Array.isArray(data) && data.length > 0 ? data[0] : data) as User
  
  // Send invitation email
  const emailResult = await emailService.sendInvitationEmail(user.email, user.id)
  
  if (!emailResult.success) {
    // Log the error but don't throw - we still want to return the created user
    console.error('Failed to send invitation email:', emailResult.error)
  }
  
  return user
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
  // Convert camelCase to snake_case for database fields
  const dbData: Record<string, string | undefined> = {}
  
  if (userData.firstName !== undefined) dbData.first_name = userData.firstName
  if (userData.lastName !== undefined) dbData.last_name = userData.lastName
  if (userData.email !== undefined) dbData.email = userData.email
  
  // Status and role are existing columns with their own types
  if (userData.status !== undefined) dbData.status = userData.status
  if (userData.role !== undefined) dbData.role = userData.role
  
  const { data, error } = await db
    .from('users')
    .update(dbData)
    .eq('id', userId)
    .select(`
      id,
      first_name as firstName,
      last_name as lastName,
      email, 
      status,
      role,
      created_at as createdAt,
      updated_at as updatedAt
    `)
  
  if (error) {
    throw error
  }
  
  const user = Array.isArray(data) ? data[0] : data;
  return user as User;
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await db
    .from('users')
    .delete()
    .eq('id', userId)
  
  if (error) {
    throw error
  }
} 