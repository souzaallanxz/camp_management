import { api, hasTeamId } from '@/lib/api-client'
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
    // First check if we have a team ID
    if (!hasTeamId()) {
      return null;
    }
    
    try {
      // Use the backend endpoint that has the correct logic for current camp
      const response = await api.get('/camps/current');
      if (response.data) {
        return response.data;
      }
      
      return null;
    } catch {
      return null;
    }
  },

  async getCampers(campId?: string): Promise<CamperWithBalance[]> {
    try {
      const url = campId ? `/campers?camp_id=${campId}` : '/campers'
      const response = await api.get(url)
      return response.data.map((camper: CamperResponse & { registration_name?: string, form_id?: string | null }) => ({
        id: camper.id,
        name: camper.name || camper.registration_name || 'Sem nome',
        snack_bar_balance: Number(camper.snack_bar_balance) || 0,
        registration: {
          id: camper.registration_id,
          camp_id: camper.camp_id
        },
        form_id: camper.form_id ?? null
      }))
    } catch {
      return []
    }
  },

  async getCamperById(id: string): Promise<CamperWithBalance> {
    const response = await api.get(`/campers/${id}`)
    const camper = response.data as CamperResponse & { form_id?: string | null }
    return {
      id: camper.id,
      name: camper.name,
      snack_bar_balance: Number(camper.snack_bar_balance) || 0,
      registration: {
        id: camper.registration_id,
        camp_id: camper.camp_id
      },
      form_id: camper.form_id ?? null
    }
  },

  async createTransaction(transaction: SnackBarTransaction): Promise<SnackBarTransactionResponse> {
    // Verify that we have a team ID
    if (!hasTeamId()) {
      throw new Error('Erro: ID da equipe necessário para criar transação')
    }
    
    try {
      const response = await api.post('/snackbar-transactions', {
        camper_id: transaction.camper_id,
        amount: transaction.amount
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar transação'
      throw new Error(errorMessage)
    }
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
      // A resposta agora contém balance, total_deposit e total_spent
      return response.data.balance
    } catch {
      return 0
    }
  },

  async getAllTransactions(campId?: string): Promise<SnackBarTransactionResponse[]> {
    if (!campId) {
      return [];
    }
    
    // Ensure team ID is available
    if (!hasTeamId()) {
      return [];
    }
    
    try {
      // Try the correct endpoint without /api prefix
      const response = await api.get(`/snackbar-transactions?camp_id=${campId}`, {
        timeout: 8000 // 8 second timeout
      });
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch {
      return [];
    }
  }
} 