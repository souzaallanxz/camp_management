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

interface SimplePerson {
  id: string
  name: string
  email: string
  contact: string
  form_id?: string | null
  camp_name: string
  type: 'camper' | 'staff'
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
      // Use the new optimized endpoint that returns both campers and staff in one call
      const url = campId ? `/people/simple?camp_id=${campId}` : '/people/simple'
      const response = await api.get(url)
      
      // Transform the simple data to match the expected format
      return response.data.map((person: SimplePerson) => {
        if (person.type === 'staff') {
          return {
            id: person.id,
            name: person.name,
            total_balance: 0, // Will be calculated when needed
            camp_id: person.camp_name, // Using camp_name as camp_id for compatibility
            type: 'staff' as const
          }
        } else {
          return {
            id: person.id,
            name: person.name,
            snack_bar_balance: 0, // Will be calculated when needed
            registration: {
              id: '', // Not available in simple endpoint
              camp_id: person.camp_name // Using camp_name as camp_id for compatibility
            },
            form_id: person.form_id,
            type: 'camper' as const
          }
        }
      })
    } catch {
      return []
    }
  },

  async getPersonById(id: string): Promise<CamperWithBalance | StaffWithBalance | null> {
    try {
      // Primeiro tentar buscar como camper
      try {
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
          form_id: camper.form_id ?? null,
          type: 'camper' as const
        }
      } catch {
        // Se não for camper, tentar como staff
        try {
          const response = await api.get(`/staff/${id}`)
          const staff = response.data
          return {
            id: staff.id,
            name: staff.name,
            total_balance: Number(staff.total_balance) || 0,
            camp_id: staff.camp_id,
            type: 'staff' as const
          }
        } catch {
          return null
        }
      }
    } catch {
      return null
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



  async getPersonData(personId: string): Promise<{ 
    person: CamperWithBalance | StaffWithBalance | null; 
    balance: number; 
    payment_status: string; 
    transactions: SnackBarTransactionResponse[] 
  }> {
    if (!personId) {
      return { 
        person: null, 
        balance: 0, 
        payment_status: 'confirmed', 
        transactions: [] 
      }
    }
    
    try {
      // Use the new optimized endpoint that gets person with balance in one call
      const personResponse = await api.get(`/people/${personId}`)
      const person = personResponse.data
      
      if (!person) {
        return { 
          person: null, 
          balance: 0, 
          payment_status: 'confirmed', 
          transactions: [] 
        }
      }
      
      const isStaff = person.type === 'staff'
      
      // Get transactions using the appropriate endpoint
      const transactionsResponse = await api.get(
        isStaff 
          ? `/snackbar-transactions/staff/${personId}`
          : `/snackbar-transactions/${personId}`
      )
      
      const balance = person.snack_bar_balance || 0
      const payment_status = person.payment_status || 'confirmed'
      const transactions = transactionsResponse.data || []
      
      // Transform person to match expected format
      const transformedPerson = isStaff 
        ? {
            id: person.id,
            name: person.name,
            total_balance: balance,
            camp_id: person.camp_name,
            type: 'staff' as const
          }
        : {
            id: person.id,
            name: person.name,
            snack_bar_balance: balance,
            registration: {
              id: '', // Not available in this endpoint
              camp_id: person.camp_name
            },
            form_id: person.form_id,
            type: 'camper' as const
          }
      
      return {
        person: transformedPerson,
        balance,
        payment_status,
        transactions
      }
    } catch {
      return { 
        person: null, 
        balance: 0, 
        payment_status: 'confirmed', 
        transactions: [] 
      }
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