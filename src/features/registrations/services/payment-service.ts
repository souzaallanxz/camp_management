import { buildApiUrl } from '@/services/api'

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

export async function getPaymentsByRegistrationId(registrationId: string) {
  const response = await fetch(buildApiUrl(`/payments?registrationId=${registrationId}`), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar pagamentos');
  return response.json();
}

interface CreatePaymentData {
  registration_id: string
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro'
  amount: number
  payment_date: string
  phone_number: string | null
  payment_link: string | null
}

// Definindo o tipo Payment
interface Payment {
  id: number
  registration_id: string
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro'
  amount: number
  payment_date: string
  phone_number: string | null
  payment_link: string | null
  created_at: string
  updated_at: string
}

export async function createPayment(data: CreatePaymentData) {
  const response = await fetch(buildApiUrl('/payments'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Erro ao criar pagamento');
  return response.json();
}

export async function updatePayment(id: number, data: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>) {
  const response = await fetch(buildApiUrl(`/payments/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Erro ao atualizar pagamento');
  return response.json();
}

export async function deletePayment(id: number) {
  const response = await fetch(buildApiUrl(`/payments/${id}`), {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar pagamento');
}

export async function getLatestPaymentLink(registrationId: string) {
  const response = await fetch(buildApiUrl(`/payments/latest-link?registrationId=${registrationId}`), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.payment_link || null;
}

export const paymentService = {
  createPayment,
  getPaymentsByRegistrationId,
  updatePayment,
  deletePayment,
  getLatestPaymentLink,
} 