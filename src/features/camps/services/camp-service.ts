import { supabase } from '@/lib/supabase'
import { type Camp, type InsertCamp, type UpdateCamp } from '../data/schema'
import { getCurrentUserTeam } from '@/features/auth/auth-service'

async function findAll() {
  try {
    const teamId = await getCurrentUserTeam()
    
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
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
  
  const { data, error } = await supabase
    .from('camps')
    .insert({ ...camp, team_id: teamId })
    .select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function update(id: string, camp: UpdateCamp) {
  const teamId = await getCurrentUserTeam()
  
  const { data, error } = await supabase
    .from('camps')
    .update(camp)
    .eq('id', id)
    .eq('team_id', teamId)
    .select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function remove(id: string) {
  const teamId = await getCurrentUserTeam()

  // Check if there are any registrations for this camp
  const { data: registrations, error: registrationsError } = await supabase
    .from('registrations')
    .select('id')
    .eq('camp_id', id)
    .limit(1)

  if (registrationsError) {
    throw registrationsError
  }

  if (registrations && registrations.length > 0) {
    throw new Error('Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.')
  }

  const { error } = await supabase
    .from('camps')
    .delete()
    .eq('id', id)
    .eq('team_id', teamId)

  if (error) {
    throw error
  }
}

export const campService = {
  findAll,
  create,
  update,
  remove,
} 