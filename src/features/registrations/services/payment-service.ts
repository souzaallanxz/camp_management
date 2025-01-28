import { supabase } from '@/lib/supabase'
import { Payment } from '../data/schema'

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
  try {
    console.log('Attempting to create payment with data:', payment)

    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...payment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating payment:', error)
      throw new Error(`Erro ao criar pagamento: ${error.message}`)
    }

    if (!data) {
      throw new Error('Erro ao criar pagamento: nenhum dado retornado')
    }

    console.log('Payment created successfully:', data)
    return data
  } catch (error) {
    console.error('Error in createPayment:', error)
    throw error
  }
}

export async function getPaymentsByRegistrationId(registrationId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('registration_id', registrationId)
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error)
    throw error
  }

  return data || []
} 