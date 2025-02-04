import { supabase } from '@/lib/supabase'
import { type Camp, type InsertCamp, type UpdateCamp } from '../data/schema'

async function getCurrentUserTeam() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: userData, error: userError } = await supabase
    .from('auth.users')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (userError) throw userError
  if (!userData?.team_id) throw new Error('User has no team assigned')

  return userData.team_id
}

async function findAll() {
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
}

async function create(camp: InsertCamp) {
  const { data, error } = await supabase.from('camps').insert(camp).select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function update(id: string, camp: UpdateCamp) {
  const { data, error } = await supabase
    .from('camps')
    .update(camp)
    .eq('id', id)
    .select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function remove(id: string) {
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

  const { error } = await supabase.from('camps').delete().eq('id', id)

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