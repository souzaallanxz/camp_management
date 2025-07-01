import { api } from '@/lib/api-client'

// Definindo o tipo Payment
export interface Payment {
  id: number;
  registration_id: string;
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro' | 'Desconto' | 'Multibanco';
  amount: number;
  payment_date: string;
  phone_number: string | null;
  payment_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  registration_id: string;
  payment_method: 'MB Way' | 'Transferência Bancária' | 'Dinheiro' | 'Desconto' | 'Multibanco';
  amount: number;
  payment_date: string;
  phone_number: string | null;
  payment_link: string | null;
}

class PaymentService {
  private debug(message: string, data?: unknown) {
    // Debug logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[PaymentService] ${message}`, data)
    }
  }

  private debugError(message: string, error: unknown) {
    // Error logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[PaymentService] ${message}`, error)
    }
  }

  async getPaymentsByRegistrationId(registrationId: string): Promise<Payment[]> {
    try {
      const response = await api.get(`/payments?registrationId=${registrationId}`)
      return response.data
    } catch (error) {
      this.debugError(`Error fetching payments for registration ${registrationId}:`, error)
      return []
    }
  }

  async getBulkPayments(registrationIds: string[]): Promise<Payment[]> {
    try {
      const queryParams = registrationIds.map(id => `registrationIds=${id}`).join('&')
      const response = await api.get(`/payments/bulk?${queryParams}`)
      return response.data
    } catch (error) {
      this.debugError('Error fetching bulk payments:', error)
      return []
    }
  }

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    try {
      const response = await api.post('/payments', data)
      return response.data
    } catch (error) {
      this.debugError('Error creating payment:', error)
      throw error
    }
  }

  async updatePayment(id: number, data: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>): Promise<Payment> {
    try {
      const response = await api.put(`/payments/${id}`, data)
      return response.data
    } catch (error) {
      this.debugError(`Error updating payment ${id}:`, error)
      throw error
    }
  }

  async deletePayment(id: number): Promise<void> {
    try {
      await api.delete(`/payments/${id}`)
    } catch (error) {
      this.debugError(`Error deleting payment ${id}:`, error)
      throw error
    }
  }

  async getLatestPaymentLink(registrationId: string): Promise<string | null> {
    try {
      const response = await api.get(`/payments/latest-link?registrationId=${registrationId}`)
      return response.data?.payment_link || null
    } catch (error) {
      this.debugError(`Error fetching latest payment link for registration ${registrationId}:`, error)
      return null
    }
  }
}

export const paymentService = new PaymentService() 