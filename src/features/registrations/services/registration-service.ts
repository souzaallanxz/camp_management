import { supabase } from '@/lib/supabase'
import {
  type Registration,
  type UpdateRegistration,
} from '../data/schema'

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Você precisa estar autenticado para realizar esta ação. Por favor, faça login.')
  }
  return session
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
      camp:camps!registrations_camp_id_fkey (
        id,
        name,
        price,
        start_date,
        end_date,
        created_at,
        updated_at
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
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Transform the data to include total_amount_paid at the root level and fix camper data
  return data.map((registration) => {
    const totalPaid = registration.registration_totals?.[0]?.total_amount_paid || 0
    const camper = Array.isArray(registration.camper) ? registration.camper[0] : registration.camper
    const camp = Array.isArray(registration.camp) ? registration.camp[0] : registration.camp

    const { id, name, email, contact, status, onboarding_status, created_at, updated_at, camp_id, form_id } = registration

    return {
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
  })
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
  await checkAuth()
  return findAll()
}

export async function getRegistrationById(id: string): Promise<Registration> {
  await checkAuth()

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
        updated_at
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
    .single()

  if (error) {
    throw new Error(`Error fetching registration: ${error.message}`)
  }

  if (!data) {
    throw new Error('Registration not found')
  }

  // Transform the data to include total_amount_paid at the root level and fix camper data
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
  const session = await checkAuth()

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
  await checkAuth()

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
