import { supabase } from '@/lib/supabase'
import { Payment } from '../data/schema'

export async function getPaymentsByRegistrationId(registrationId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('registration_id', registrationId)
    .order('payment_date', { ascending: false })

  if (error) {
    throw new Error(`Error fetching payments: ${error.message}`)
  }

  return data || []
}

interface CreatePaymentData {
  registration_id: string
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro'
  amount: number
  payment_date: string
  phone_number: string | null
  payment_link: string | null
}

async function updateRegistrationStatus(registrationId: string) {
  // Get the registration with its camp and total payments
  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .select(`
      id,
      camps!registrations_camp_id_fkey (
        price
      ),
      payments (
        amount
      )
    `)
    .eq('id', registrationId)
    .single()

  if (registrationError) throw registrationError

  if (!registration) throw new Error('Registration not found')

  // Calculate total payments
  const totalPaid = registration.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const camp = Array.isArray(registration.camps) ? registration.camps[0] : registration.camps
  const campPrice = Number(camp?.price || 0)

  // Determine new status
  let newStatus = 'unpaid'
  if (totalPaid >= campPrice) {
    newStatus = 'paid'
  } else if (totalPaid > 0) {
    newStatus = 'partial'
  }

  // Update registration status
  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', registrationId)

  if (updateError) throw updateError
}

export async function createPayment(data: CreatePaymentData) {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  // Update registration status after payment is created
  await updateRegistrationStatus(data.registration_id)

  return payment
}

export async function updatePayment(id: number, data: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>) {
  const { data: payment, error } = await supabase
    .from('payments')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Update registration status after payment is updated
  if (payment) {
    await updateRegistrationStatus(payment.registration_id)
  }

  return payment
}

export async function deletePayment(id: number) {
  // Get the registration_id before deleting
  const { data: payment, error: getError } = await supabase
    .from('payments')
    .select('registration_id')
    .eq('id', id)
    .single()

  if (getError) throw getError

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) throw error

  // Update registration status after payment is deleted
  if (payment) {
    await updateRegistrationStatus(payment.registration_id)
  }
}

export const paymentService = {
  createPayment,
  getPaymentsByRegistrationId,
  updatePayment,
  deletePayment,
} 