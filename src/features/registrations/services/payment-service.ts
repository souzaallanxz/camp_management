import { db } from '@/lib/db'
import { Payment } from '../data/schema'

export async function getPaymentsByRegistrationId(registrationId: string): Promise<Payment[]> {
  const { data, error } = await db.query(
    'SELECT * FROM payments WHERE registration_id = $1 ORDER BY created_at DESC',
    [registrationId]
  )

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
  // Get total paid amount
  const { data: totalPaid, error: totalError } = await db.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE registration_id = $1',
    [registrationId]
  )

  if (totalError) throw totalError

  // Get the registration with its camp
  const { data: registration, error: registrationError } = await db.query(
    `SELECT r.id, c.price as camp_price
     FROM registrations r
     JOIN camps c ON r.camp_id = c.id
     WHERE r.id = $1`,
    [registrationId]
  )

  if (registrationError) throw registrationError
  if (!registration || registration.length === 0) throw new Error('Registration not found')

  const campPrice = Number(registration[0].camp_price || 0)

  // Determine new status
  let newStatus = 'unpaid'
  if (totalPaid[0].total >= campPrice) {
    newStatus = 'paid'
  } else if (totalPaid[0].total > 0) {
    newStatus = 'partial'
  }

  // Update registration status
  const { error: updateError } = await db.query(
    'UPDATE registrations SET status = $1 WHERE id = $2',
    [newStatus, registrationId]
  )

  if (updateError) throw updateError
}

export async function createPayment(data: CreatePaymentData) {
  try {
    // Usar SQL direto e deixar o banco de dados gerar o UUID via gen_random_uuid()
    const { data: payment, error } = await db.query(`
      INSERT INTO payments (
        id,
        registration_id, 
        payment_method, 
        amount, 
        payment_date, 
        phone_number, 
        payment_link, 
        payment_status
      ) VALUES (
        gen_random_uuid(), -- Gera um UUID diretamente no PostgreSQL
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `, [
      data.registration_id,
      data.payment_method,
      data.amount,
      data.payment_date,
      data.phone_number,
      data.payment_link,
      'confirmed'
    ]);

    if (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }

    if (!payment || !Array.isArray(payment) || payment.length === 0) {
      throw new Error('No payment data returned');
    }

    try {
      await updateRegistrationStatus(data.registration_id);
    } catch (updateError) {
      console.error('Error updating registration status:', updateError);
      // Continue mesmo se houver erro ao atualizar o status
    }

    return payment[0];
  } catch (error) {
    throw error;
  }
}

export async function updatePayment(id: number, data: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>) {
  const { data: payment, error } = await db.query(
    `UPDATE payments
     SET ${Object.keys(data)
       .map((key, index) => `${key} = $${index + 2}`)
       .join(', ')}
     WHERE id = $1
     RETURNING *`,
    [id, ...Object.values(data)]
  )

  if (error) {
    throw new Error(`Error updating payment: ${error.message}`)
  }

  if (data.registration_id) {
    await updateRegistrationStatus(data.registration_id)
  }

  return payment[0]
}

export async function deletePayment(id: number) {
  const { data: payment, error: getError } = await db.query(
    'SELECT registration_id FROM payments WHERE id = $1',
    [id]
  )

  if (getError) {
    throw new Error(`Error getting payment: ${getError.message}`)
  }

  const { error } = await db.query(
    'DELETE FROM payments WHERE id = $1',
    [id]
  )

  if (error) {
    throw new Error(`Error deleting payment: ${error.message}`)
  }

  if (payment && payment.length > 0) {
    await updateRegistrationStatus(payment[0].registration_id)
  }
}

export async function getLatestPaymentLink(registrationId: string): Promise<string | null> {
  const { data, error } = await db.query(
    'SELECT payment_link FROM payments WHERE registration_id = $1 AND payment_link IS NOT NULL ORDER BY created_at DESC LIMIT 1',
    [registrationId]
  )

  if (error) {
    throw new Error(`Error fetching payment link: ${error.message}`)
  }

  return data && data.length > 0 ? data[0].payment_link : null
}

export const paymentService = {
  createPayment,
  getPaymentsByRegistrationId,
  updatePayment,
  deletePayment,
  getLatestPaymentLink,
} 