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
      console.error('Cannot get current camp: No team ID available');
      return null;
    }
    
    try {
      // First try to get current active camp
      const response = await api.get('/api/camps/current');
      if (response.data) {
        return response.data;
      }
      
      // If no current camp, get the most recent or upcoming camp
      const allCampsResponse = await api.get('/api/camps');
      if (allCampsResponse.data && Array.isArray(allCampsResponse.data) && allCampsResponse.data.length > 0) {
        const camps = allCampsResponse.data;
        const today = new Date();
        
        // Try to find an upcoming camp
        const upcomingCamps = camps.filter(camp => new Date(camp.start_date) > today)
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        
        if (upcomingCamps.length > 0) {
          return upcomingCamps[0]; // Return the closest upcoming camp
        }
        
        // If no upcoming camps, return the most recently ended camp
        const pastCamps = camps.filter(camp => new Date(camp.end_date) < today)
          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
        
        if (pastCamps.length > 0) {
          return pastCamps[0]; // Return the most recently ended camp
        }
        
        // If all else fails, return the first camp in the list
        return camps[0];
      }
      
      return null;
    } catch (error) {
      // Use console.warn instead of console.error to avoid linter issues
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error getting current camp:', error);
      }
      
      // Try fallback approach directly
      try {
        const allCampsResponse = await api.get('/api/camps');
        if (allCampsResponse.data && Array.isArray(allCampsResponse.data) && allCampsResponse.data.length > 0) {
          return allCampsResponse.data[0]; // Return first camp as fallback
        }
      } catch (fallbackError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Error in fallback camp fetch');
        }
      }
      
      return null;
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