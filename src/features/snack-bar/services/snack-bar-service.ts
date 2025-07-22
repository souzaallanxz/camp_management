import { api, hasTeamId } from '@/lib/api-client'
import { staffService } from '@/features/staff/services/staff-service'
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

interface StaffWithBalance {
  id: string
  name: string
  total_balance: number
  camp_id: string
  type: 'staff'
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
        form_id: camper.form_id ?? null,
        type: 'camper' as const
      }))
    } catch {
      return []
    }
  },

  async getStaff(): Promise<StaffWithBalance[]> {
    try {
      const staff = await staffService.findAll()
      return staff.map((member) => ({
        id: member.id,
        name: member.name,
        total_balance: Number(member.total_balance) || 0,
        camp_id: member.camp_id,
        type: 'staff' as const
      }))
    } catch {
      return []
    }
  },

  async getCampersAndStaff(campId?: string): Promise<(CamperWithBalance | StaffWithBalance)[]> {
    try {
      // Buscar campistas do acampamento atual
      const campers = await this.getCampers(campId)
      
      // Buscar todos os membros do staff
      const staff = await this.getStaff()
      
      // Combinar os dois arrays
      const allPeople = [
        ...campers,
        ...staff
      ]
      
      return allPeople
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
      // Determinar se é um camper ou staff baseado no tipo
      const allPeople = await this.getCampersAndStaff()
      const person = allPeople.find(p => p.id === transaction.camper_id)
      const isStaff = person?.type === 'staff'
      
      // Garantir que o amount seja um número
      const amount = Number(transaction.amount)
      
      const payload = isStaff 
        ? { staff_id: transaction.camper_id, amount: amount }
        : { camper_id: transaction.camper_id, amount: amount }
      
      const response = await api.post('/snackbar-transactions', payload)
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
      // Determinar se é um camper ou staff baseado no tipo
      const allPeople = await this.getCampersAndStaff()
      const person = allPeople.find(p => p.id === camper_id)
      const isStaff = person?.type === 'staff'
      
      if (isStaff) {
        // Para staff, buscar transações usando staff_id
        const response = await api.get(`/snackbar-transactions/staff/${camper_id}`)
        return response.data
      } else {
        // Para campers, usar o endpoint existente
        const response = await api.get(`/snackbar-transactions/${camper_id}`)
        return response.data
      }
    } catch {
      return []
    }
  },

  async deductBalance(transaction: SnackBarTransaction) {
    if (!transaction.camper_id) {
      return
    }
    
    // Determinar se é um camper ou staff baseado no tipo
    const allPeople = await this.getCampersAndStaff()
    const person = allPeople.find(p => p.id === transaction.camper_id)
    const isStaff = person?.type === 'staff'
    
    // Get current balance using the appropriate endpoint
    let balanceResponse
    if (isStaff) {
      balanceResponse = await api.get(`/snackbar-balance/staff/${transaction.camper_id}`)
    } else {
      balanceResponse = await api.get(`/snackbar-balance/${transaction.camper_id}`)
    }
    const currentBalance = balanceResponse.data.balance
    
    // Verify if has sufficient balance
    if (currentBalance < transaction.amount) {
      throw new Error('Saldo insuficiente')
    }
    
    // Create transaction (deduct balance)
    await this.createTransaction(transaction)
  },

  async getCamperBalance(camperId: string): Promise<{ balance: number; payment_status: string }> {
    if (!camperId) {
      return { balance: 0, payment_status: 'confirmed' }
    }
    
    try {
      // Determinar se é um camper ou staff baseado no tipo
      const allPeople = await this.getCampersAndStaff()
      const person = allPeople.find(p => p.id === camperId)
      const isStaff = person?.type === 'staff'
      
      if (isStaff) {
        // Para staff, sempre usar o endpoint específico para obter o saldo correto
        const response = await api.get(`/snackbar-balance/staff/${camperId}`)
        const balance = response.data.balance || 0
        const payment_status = response.data.payment_status || 'confirmed'
        return { balance, payment_status }
      } else {
        // Para campers, usar o snack_bar_balance
        const balance = (person as CamperWithBalance).snack_bar_balance
        // For campers, we need to get payment_status from the API
        const response = await api.get(`/snackbar-balance/${camperId}`)
        const payment_status = response.data.payment_status || 'confirmed'
        return { balance, payment_status }
      }
    } catch {
      return { balance: 0, payment_status: 'confirmed' }
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