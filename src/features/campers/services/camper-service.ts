import { db } from '@/lib/db'
import type { Camper, InsertCamper } from '../data/schema'

// Helper function for logging in development mode only
const devLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

async function getCurrentUserTeam() {
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data: team, error } = await db.rpc('get_current_user_team')
  if (error) throw error
  return team
}

async function findAll() {
  const teamId = await getCurrentUserTeam()
  
  devLog('Current user team ID:', teamId)
  
  if (!teamId) {
    devLog('No team ID found for current user, getting all campers')
    return findAllDirectly()
  }

  // First, get all registration IDs that belong to the team
  const { data: registrationIds, error: registrationError } = await db
    .from('registrations')
    .select('id')
    .eq('camp.team_id', teamId)

  if (registrationError) {
    devLog('Error fetching registration IDs:', registrationError)
    return []
  }

  devLog(`Found ${registrationIds?.length || 0} registrations for team ${teamId}`)

  // If no registrations found, return all campers instead of empty array to help debugging
  if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
    devLog('No registrations found for team, fetching all campers as fallback')
    return findAllWithBalanceDirectly()
  }

  // Extract just the IDs into an array
  const ids = registrationIds.map(r => r.id)

  // Now query campers that have registration_id in the list
  const { data, error } = await db
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
    .in('registration_id', ids)
    .order('created_at', { ascending: false })

  if (error) {
    devLog('Error fetching campers:', error)
    throw error
  }

  devLog(`Found ${data?.length || 0} campers with registrations`)

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

// New function to get all campers with balance calculation
async function findAllWithBalanceDirectly() {
  // Get all campers with their registration and snackbar balance
  const { data, error } = await db
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
    .order('created_at', { ascending: false })

  if (error) {
    devLog('Error fetching all campers directly with balance:', error)
    return []
  }

  // Verificar se data existe antes de tentar mapear
  if (!data || !Array.isArray(data)) {
    devLog('No data returned or data is not an array')
    return []
  }

  // Calculate total balance for each camper de forma segura
  const campersWithBalance = data.map(camper => {
    // Garantir que temos acesso seguro a todas as propriedades
    const snackbarBalance = camper?.registration?.snackbar_balance || []
    
    // Calcular o total do saldo
    const totalBalance = Array.isArray(snackbarBalance) 
      ? snackbarBalance.reduce(
          (sum: number, balance: { amount: number }) => sum + Number(balance?.amount || 0),
          0
        )
      : 0
    
    return {
      ...camper,
      total_balance: totalBalance
    }
  })

  return campersWithBalance as (Camper & { total_balance: number })[]
}

async function findById(id: string) {
  const { data, error } = await db
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
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data as Camper & { total_balance: number }
}

async function create(camper: InsertCamper) {
  // If registration_id is provided, use the existing registration 
  // instead of creating a new one
  if (camper.registration_id) {
    // Create the camper with the existing registration ID
    const { data, error } = await db
      .from('campers')
      .insert({
        name: camper.name,
        email: camper.email,
        contact: camper.contact,
        registration_id: camper.registration_id,
        form_id: camper.form_id,
        camp: camper.camp,
        additional_notes: camper.additional_notes
      })
      .select()

    if (error) {
      throw error
    }

    // The result will be an array, so take the first item
    return (Array.isArray(data) && data.length > 0 ? data[0] : data) as Camper
  }
  
  // If no registration_id provided, create a new registration first
  // (This is the original flow, kept for backward compatibility)
  // If we have a registration ID, try to get the camp_id
  let camp_id = null
  if (camper.registration_id) {
    try {
      const { data: regData, error: regError } = await db
        .from('registrations')
        .select('camp_id')
        .eq('id', camper.registration_id)
        .single()
      
      if (!regError && regData) {
        camp_id = regData.camp_id
      }
    } catch (err) {
      // Silently continue with null camp_id
    }
  }

  // First, create a registration for the camper
  const { data: registration, error: registrationError } = await db
    .from('registrations')
    .insert({
      name: camper.name,
      email: camper.email,
      contact: camper.contact,
      status: 'unpaid',
      onboarding_status: 'Pendente',
      camp_id: camp_id, // Use the camp_id we fetched
      form_id: camper.form_id,
      id_number: camper.id_number,
      sns_number: camper.sns_number,
      date_of_birth: camper.date_of_birth,
      dietary_restrictions: camper.dietary_restrictions,
      guardian_name: camper.guardian_name,
      guardian_email: camper.guardian_email,
      guardian_phone: camper.guardian_phone
    })
    .select()

  if (registrationError) {
    throw registrationError
  }

  // Get the first registration from the array
  const newRegistration = Array.isArray(registration) && registration.length > 0 
    ? registration[0] 
    : registration

  // Then create the camper with the registration ID
  const { data, error } = await db
    .from('campers')
    .insert({
      ...camper,
      registration_id: newRegistration.id
    })
    .select()

  if (error) {
    throw error
  }

  // Get the first camper from the array
  return (Array.isArray(data) && data.length > 0 ? data[0] : data) as Camper
}

async function update(id: string, camper: Partial<Camper>) {
  const { data, error } = await db
    .from('campers')
    .update(camper)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Camper
}

async function findAllDirectly() {
  // Get all campers directly without filtering
  const { data, error } = await db
    .from('campers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    devLog('Error fetching all campers directly:', error)
    return []
  }

  return data || []
}

export const camperService = {
  findAll,
  findById,
  create,
  update,
  findAllDirectly,
  findAllWithBalanceDirectly
} 