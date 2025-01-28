import { supabase } from '@/lib/supabase'
import { Registration } from '../data/schema'

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Você precisa estar autenticado para realizar esta ação. Por favor, faça login.')
  }
  return session
}

export async function getRegistrations(): Promise<Registration[]> {
  await checkAuth()
  
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
      registration_totals (
        total_amount_paid
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error fetching registrations: ${error.message}`)
  }

  // Transform the data to include total_amount_paid at the root level
  const transformedData = data?.map(registration => {
    // Check if registration_totals exists and has a value
    const totalPaid = registration.registration_totals?.[0]?.total_amount_paid
    return {
      ...registration,
      registration_totals: undefined, // Remove the nested data
      total_amount_paid: totalPaid || 0
    }
  })

  return transformedData || []
}

export async function getRegistrationById(id: string): Promise<Registration> {
  await checkAuth()

  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
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

  // Transform the data to include total_amount_paid at the root level
  const totalPaid = data.registration_totals?.[0]?.total_amount_paid
  return {
    ...data,
    registration_totals: undefined, // Remove the nested data
    total_amount_paid: totalPaid || 0
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

export async function updateRegistration(id: string, registration: Partial<Registration>) {
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