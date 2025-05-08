import { getTeamIdHeader } from '@/lib/auth';

// For production, directly use the correct API URL
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

// Definindo o tipo Payment
export interface Payment {
  id: number;
  registration_id: string;
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro';
  amount: number;
  payment_date: string;
  phone_number: string | null;
  payment_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  registration_id: string;
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro';
  amount: number;
  payment_date: string;
  phone_number: string | null;
  payment_link: string | null;
}

async function getPaymentsByRegistrationId(registrationId: string) {
  try {
    const headers = { 
      ...getTeamIdHeader(),
      'Content-Type': 'application/json' 
    };
    
    const response = await fetch(`${API_BASE_URL}/payments?registrationId=${registrationId}`, { headers });
    
    if (!response.ok) {
      return [];
    }
    
    return await response.json();
  } catch {
    return [];
  }
}

async function createPayment(data: CreatePaymentData) {
  const headers = { 
    ...getTeamIdHeader(),
    'Content-Type': 'application/json' 
  };
  
  const response = await fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Erro ao criar pagamento');
  return response.json();
}

async function updatePayment(id: number, data: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>) {
  const headers = { 
    ...getTeamIdHeader(),
    'Content-Type': 'application/json' 
  };
  
  const response = await fetch(`${API_BASE_URL}/payments/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Erro ao atualizar pagamento');
  return response.json();
}

async function deletePayment(id: number) {
  const headers = { ...getTeamIdHeader() };
  
  const response = await fetch(`${API_BASE_URL}/payments/${id}`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) throw new Error('Erro ao deletar pagamento');
}

async function getLatestPaymentLink(registrationId: string) {
  const headers = { 
    ...getTeamIdHeader(),
    'Content-Type': 'application/json' 
  };
  
  const response = await fetch(`${API_BASE_URL}/payments/latest-link?registrationId=${registrationId}`, { headers });
  
  if (!response.ok) return null;
  const data = await response.json();
  return data?.payment_link || null;
}

export {
  createPayment,
  getPaymentsByRegistrationId,
  updatePayment,
  deletePayment,
  getLatestPaymentLink
};

export const paymentService = {
  createPayment,
  getPaymentsByRegistrationId,
  updatePayment,
  deletePayment,
  getLatestPaymentLink,
}; 