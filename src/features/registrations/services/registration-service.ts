import { supabase } from '@/lib/supabase'
import {
  type Registration,
  type UpdateRegistration,
} from '../data/schema'
import { getCurrentUserTeam } from '@/features/auth/auth-service'

async function findAll() {
  try {
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
        camper:campers (
          id,
          name,
          email,
          contact,
          created_at,
          updated_at
        )
      `)
      .eq('camp.team_id', teamId)
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
  } catch (error) {
    if (error instanceof Error && error.message === 'User has no team assigned') {
      return []
    }
    throw error
  }
}

interface CreateRegistrationData {
  camp_id: string
  name: string
  email: string
  contact: string
  form_id?: string | null
}

async function create(registration: CreateRegistrationData) {
  const teamId = await getCurrentUserTeam()

  try {
    // First verify if the camp belongs to the user's team
    const { data: camp, error: campError } = await supabase
      .from('camps')
      .select('id')
      .eq('id', registration.camp_id)
      .eq('team_id', teamId)
      .single()

    if (campError || !camp) {
      throw new Error('Camp not found or does not belong to your team')
    }

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
  const teamId = await getCurrentUserTeam()

  const { data, error } = await supabase
    .from('registrations')
    .update(registration)
    .eq('id', id)
    .eq('camp.team_id', teamId)
    .select()

  if (error) {
    throw error
  }

  return data[0] as Registration
}

async function remove(id: string) {
  const teamId = await getCurrentUserTeam()

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', id)
    .eq('camp.team_id', teamId)

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

export async function getRegistrations() {
  const teamId = await getCurrentUserTeam()

  const { data: registrations, error } = await supabase
    .from('registrations')
    .select(`
      *,
      camp:camps!registrations_camp_id_fkey (
        id,
        name,
        price,
        team_id
      )
    `)
    .eq('camp.team_id', teamId)

  if (error) throw error

  // Get totals for each registration using the secure function
  const registrationsWithTotals = await Promise.all(
    registrations.map(async (registration) => {
      const { data: totalPaid, error: totalError } = await supabase
        .rpc('get_registration_total', { registration_id: registration.id })

      if (totalError) {
        return null
      }

      const camp = Array.isArray(registration.camp) ? registration.camp[0] : registration.camp
      const campPrice = Number(camp?.price || 0)
      const totalPaidAmount = Number(totalPaid || 0)

      // Determine status based on total paid vs camp price
      let status = registration.status
      if (totalPaidAmount >= campPrice) {
        status = 'paid'
      } else if (totalPaidAmount > 0) {
        status = 'partial'
      } else {
        status = 'unpaid'
      }

      return {
        ...registration,
        total_amount_paid: totalPaidAmount,
        status
      }
    })
  )

  return registrationsWithTotals.filter((r): r is Registration => r !== null)
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
      camper:campers (
        id,
        name,
        email,
        contact,
        created_at,
        updated_at
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

  // Get total using the secure function
  const { data: totalData, error: totalError } = await supabase
    .rpc('get_registration_total', { registration_id: data.id })

  if (totalError) {
    throw totalError
  }

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
    total_amount_paid: totalData || 0
  }
}

export async function createRegistration(registration: Omit<Registration, 'id' | 'created_at' | 'updated_at'>) {
  const teamId = await getCurrentUserTeam()

  // First verify if the camp belongs to the user's team
  const { data: camp, error: campError } = await supabase
    .from('camps')
    .select('id')
    .eq('id', registration.camp_id)
    .eq('team_id', teamId)
    .single()

  if (campError || !camp) {
    throw new Error('Camp not found or does not belong to your team')
  }

  const { data, error } = await supabase
    .from('registrations')
    .insert({
      ...registration,
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
  const teamId = await getCurrentUserTeam()

  const { data, error } = await supabase
    .from('registrations')
    .update(registration)
    .eq('id', id)
    .eq('camp.team_id', teamId)
    .select()
    .single()

  if (error) {
    throw new Error(`Error updating registration: ${error.message}`)
  }

  return data
}

export async function deleteRegistration(id: string) {
  const teamId = await getCurrentUserTeam()

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', id)
    .eq('camp.team_id', teamId)

  if (error) {
    throw new Error(`Error deleting registration: ${error.message}`)
  }
}

export async function updateOnboardingStatus(id: string, status: 'Pendente' | 'Onboarded') {
  const teamId = await getCurrentUserTeam()

  // First, get the camper's form_id
  const { data: camper, error: camperError } = await supabase
    .from('campers')
    .select('form_id, registration:registration_id(camp:camp_id(team_id))')
    .eq('registration_id', id)
    .eq('registration.camp.team_id', teamId)
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
    .eq('camp.team_id', teamId)
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
