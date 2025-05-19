import { api } from '@/lib/api-client'
import type { 
  SnackBarTransaction, 
  SnackBarTransactionResponse,
  CamperWithBalance
} from '../data/schema'

interface CamperResponse {
  id: string
  name: string
  snack_bar_balance: number
  registration_id: string
  camp_id: string
}

export const snackBarService = {
  async getCurrentCamp() {
    try {
      const response = await api.get('/api/camps/current')
      return response.data
    } catch {
      return null
    }
  },

  async getCampers(campId?: string): Promise<CamperWithBalance[]> {
    try {
      const url = campId ? `/api/campers?camp_id=${campId}` : '/api/campers'
      const response = await api.get(url)
      return response.data.map((camper: CamperResponse & { registration_name?: string }) => ({
        id: camper.id,
        name: camper.name || camper.registration_name || 'Sem nome',
        snack_bar_balance: Number(camper.snack_bar_balance) || 0,
        registration: {
          id: camper.registration_id,
          camp_id: camper.camp_id
        }
      }))
    } catch {
      return []
    }
  },

  async getCamperById(id: string): Promise<CamperWithBalance> {
    const response = await api.get(`/campers/${id}`)
    const camper = response.data as CamperResponse
    return {
      id: camper.id,
      name: camper.name,
      snack_bar_balance: Number(camper.snack_bar_balance) || 0,
      registration: {
        id: camper.registration_id,
        camp_id: camper.camp_id
      }
    }
  },

  async createTransaction(transaction: SnackBarTransaction): Promise<SnackBarTransactionResponse> {
    const response = await api.post('/snackbar-transactions', {
      camper_id: transaction.camper_id,
      amount: transaction.amount
    })
    return response.data
  },

  async getCamperTransactions(camper_id: string): Promise<SnackBarTransactionResponse[]> {
    if (!camper_id) {
      return []
    }
    
    try {
      const response = await api.get(`/snackbar-transactions/${camper_id}`)
      return response.data
    } catch {
      return []
    }
  },

  async deductBalance(transaction: SnackBarTransaction) {
    if (!transaction.camper_id) {
      return
    }
    
    // Get current balance
    const balanceResponse = await api.get(`/snackbar-balance/${transaction.camper_id}`)
    const currentBalance = balanceResponse.data.balance
    
    // Verify if has sufficient balance
    if (currentBalance < transaction.amount) {
      throw new Error('Saldo insuficiente')
    }
    
    // Create transaction (deduct balance)
    await this.createTransaction(transaction)
  },

  async getCamperBalance(camperId: string) {
    if (!camperId) {
      return 0
    }
    
    try {
      const response = await api.get(`/snackbar-balance/${camperId}`)
      return response.data.balance
    } catch {
      return 0
    }
  },

  async getAllTransactions(campId?: string): Promise<SnackBarTransactionResponse[]> {
    if (!campId) {
      return [];
    }
    try {
      const response = await api.get(`/snackbar-transactions?camp_id=${campId}`)
      return Array.isArray(response.data) ? response.data : []
    } catch {
      return []
    }
  }
} 