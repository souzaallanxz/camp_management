import { supabase } from '@/lib/supabase'
import {
  type Registration,
  type UpdateRegistration,
} from '../data/schema'

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
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      name,
      email,
      contact,
      status,
      onboarding_status,
      form_id,
      created_at,
      updated_at,
      camp_id,
      camp:camps!inner (
        id,
        name,
        price,
        start_date,
        end_date,
        created_at,
        updated_at
      ),
      camper:campers (
        id,
        name,
        email,
        contact,
        created_at,
        updated_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Get totals for each registration using the secure function
  const registrationsWithTotals = await Promise.all(
    data.map(async (registration) => {
      const { data: totalData, error: totalError } = await supabase
        .rpc('get_registration_total', { registration_id: registration.id })

      if (totalError) {
        return null
      }

      const camper = Array.isArray(registration.camper) ? registration.camper[0] : registration.camper
      const camp = Array.isArray(registration.camp) ? registration.camp[0] : registration.camp

      const result: Registration = {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        contact: registration.contact,
        status: registration.status,
        onboarding_status: registration.onboarding_status,
        form_id: registration.form_id,
        created_at: registration.created_at,
        updated_at: registration.updated_at,
        camp_id: registration.camp_id,
        camp: camp ? {
          id: camp.id,
          name: camp.name,
          price: camp.price,
          start_date: camp.start_date,
          end_date: camp.end_date,
          created_at: camp.created_at,
          updated_at: camp.updated_at
        } : null,
        camper: camper ? {
          id: camper.id,
          name: camper.name,
          email: camper.email,
          contact: camper.contact,
          created_at: camper.created_at,
          updated_at: camper.updated_at
        } : null,
        total_amount_paid: totalData || 0
      }

      return result
    })
  )

  return registrationsWithTotals.filter((r): r is Registration => r !== null)
}

interface CreateRegistrationData {
  camp_id: string
  name: string
  email: string
  contact: string
  form_id?: string | null
}

async function create(registration: CreateRegistrationData) {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .insert(registration)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Erro ao criar inscrição: nenhum dado retornado')
    }

    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar inscrição'
    throw new Error(message)
  }
}

async function update(id: string, registration: UpdateRegistration) {
  const { data, error } = await supabase
    .from('registrations')
    .update(registration)
    .eq('id', id)
    .select()

  if (error) {
    throw error
  }

  return data[0] as Registration
}

async function remove(id: string) {
  const { error } = await supabase.from('registrations').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export const registrationService = {
  findAll,
  create,
  update,
  remove,
}

export async function getRegistrations(): Promise<Registration[]> {
  await getCurrentUserTeam()
  return findAll()
}

export async function getRegistrationById(id: string): Promise<Registration> {
  const teamId = await getCurrentUserTeam()

  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      name,
      email,
      contact,
      status,
      onboarding_status,
      form_id,
      created_at,
      updated_at,
      camp_id,
      camp:camps!registrations_camp_id_fkey (
        id,
        name,
        price,
        start_date,
        end_date,
        created_at,
        updated_at,
        team_id
      ),
      camper:campers!campers_registration_id_fkey (
        id,
        name,
        email,
        contact,
        created_at,
        updated_at
      ),
      registration_totals (
        total_amount_paid
      )
    `)
    .eq('id', id)
    .eq('camp.team_id', teamId)
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Registration not found')
  }

  const totalPaid = data.registration_totals?.[0]?.total_amount_paid || 0
  const camper = Array.isArray(data.camper) ? data.camper[0] : data.camper
  const camp = Array.isArray(data.camp) ? data.camp[0] : data.camp

  const { id: registrationId, name, email, contact, status, onboarding_status, created_at, updated_at, camp_id, form_id } = data

  return {
    id: registrationId,
    name,
    email,
    contact,
    status,
    onboarding_status,
    form_id,
    created_at,
    updated_at,
    camp_id,
    camp: camp ? {
      id: camp.id,
      name: camp.name,
      price: camp.price,
      start_date: camp.start_date,
      end_date: camp.end_date,
      created_at: camp.created_at,
      updated_at: camp.updated_at
    } : null,
    camper: camper ? {
      id: camper.id,
      name: camper.name,
      email: camper.email,
      contact: camper.contact,
      created_at: camper.created_at,
      updated_at: camper.updated_at
    } : null,
    total_amount_paid: totalPaid
  }
}

export async function createRegistration(registration: Omit<Registration, 'id' | 'created_at' | 'updated_at'>) {
  const session = await getCurrentUserTeam()

  const { data, error } = await supabase
    .from('registrations')
    .insert({
      ...registration,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar inscrição: ${error.message}`)
  }

  if (!data) {
    throw new Error('Erro ao criar inscrição: nenhum dado retornado')
  }

  return data
}

export async function updateRegistration(id: string, registration: UpdateRegistration) {
  const { data, error } = await supabase
    .from('registrations')
    .update(registration)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Error updating registration: ${error.message}`)
  }

  return data
}

export async function deleteRegistration(id: string) {
  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Error deleting registration: ${error.message}`)
  }
}

export async function updateOnboardingStatus(id: string, status: 'Pendente' | 'Onboarded') {
  await getCurrentUserTeam()

  // First, get the camper's form_id
  const { data: camper, error: camperError } = await supabase
    .from('campers')
    .select('form_id')
    .eq('registration_id', id)
    .single()

  if (camperError) {
    throw new Error(`Erro ao buscar dados do camper: ${camperError.message}`)
  }

  // Update both onboarding_status and form_id
  const { data, error } = await supabase
    .from('registrations')
    .update({ 
      onboarding_status: status,
      form_id: camper?.form_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar status de onboarding: ${error.message}`)
  }

  if (!data) {
    throw new Error('Erro ao atualizar status de onboarding: inscrição não encontrada')
  }

  return data
}
