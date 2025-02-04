import { supabase } from '@/lib/supabase'
import { type Camper, type InsertCamper } from '../data/schema'

async function getCurrentUserTeam() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Use o RPC function que criamos para obter o team_id do usuário
  const { data: team, error } = await supabase.rpc('get_current_user_team')
  if (error) throw error
  if (!team || !team[0]?.id) throw new Error('User has no team assigned')

  return team[0].id
}

async function findAll() {
  const teamId = await getCurrentUserTeam()

  const { data, error } = await supabase
    .from('campers')
    .select(`
      *,
      registration:registration_id (
        id,
        camp:camp_id (
          id,
          team_id
        ),
        snackbar_balance (
          amount
        )
      )
    `)
    .eq('registration.camp.team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Calculate total balance for each camper
  const campersWithBalance = data.map(camper => ({
    ...camper,
    total_balance: camper.registration?.snackbar_balance?.reduce(
      (sum: number, balance: { amount: number }) => sum + Number(balance.amount),
      0
    ) ?? 0
  }))

  return campersWithBalance as (Camper & { total_balance: number })[]
}

async function create(camper: InsertCamper) {
  try {
    const teamId = await getCurrentUserTeam()

    // Validate that the registration belongs to the user's team
    if (camper.registration_id) {
      const { data: registration, error: registrationError } = await supabase
        .from('registrations')
        .select('camp:camp_id(team_id)')
        .eq('id', camper.registration_id)
        .single()

      if (registrationError) throw registrationError
      if (!registration || registration.camp.team_id !== teamId) {
        throw new Error('Registration does not belong to your team')
      }
    }

    const { data, error } = await supabase
      .from('campers')
      .insert(camper)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Erro ao criar camper: nenhum dado retornado')
    }

    return data as Camper
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar camper'
    throw new Error(message)
  }
}

export const camperService = {
  findAll,
  create,
} 