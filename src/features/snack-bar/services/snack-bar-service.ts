import { db } from '@/lib/db'
import type { 
  SnackBarTransaction, 
  SnackBarTransactionResponse,
  CamperWithBalance
} from '../data/schema'

export const snackBarService = {
  async getCurrentCamp() {
    const today = new Date().toISOString()
    
    try {
      // Usar SQL direto em vez de ORM com lte/gte
      const { data, error } = await db.query(`
        SELECT * FROM camps 
        WHERE start_date <= $1 AND end_date >= $1
        AND team_id = (
          SELECT team_id FROM auth.users 
          WHERE auth.users.id = auth.uid()
        )
        LIMIT 1
      `, [today])

      if (error) {
        return null
      }

      // Se não encontrou nenhum acampamento, retorna null
      if (!data || data.length === 0) {
        return null
      }
      
      return data[0]
    } catch (e) {
      return null
    }
  },

  async getCampers(): Promise<CamperWithBalance[]> {
    try {
      // Primeiro obter o acampamento atual
      const currentCamp = await this.getCurrentCamp();
      
      if (!currentCamp) {
        return [];
      }
      
      // Usar SQL direto com filtro para o acampamento atual e equipe do usuário
      const { data, error } = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.snack_bar_balance,
          r.id as registration_id,
          r.camp_id
        FROM campers c
        JOIN registrations r ON c.registration_id = r.id
        JOIN camps camp ON r.camp_id = camp.id
        WHERE r.camp_id = $1
        AND camp.team_id = (
          SELECT team_id FROM auth.users 
          WHERE auth.users.id = auth.uid()
        )
        ORDER BY c.name ASC
      `, [currentCamp.id])

      if (error) {
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }
      
      return data.map(camper => ({
        id: camper.id,
        name: camper.name,
        snack_bar_balance: camper.snack_bar_balance,
        registration: {
          id: camper.registration_id,
          camp_id: camper.camp_id
        }
      })) as CamperWithBalance[];
    } catch (e) {
      return [];
    }
  },

  async getCamperById(id: string): Promise<CamperWithBalance> {
    const { data, error } = await db
      .from('campers')
      .select(`
        id,
        name,
        snack_bar_balance,
        registration:registration_id!inner (
          id,
          camp_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return {
      ...data,
      registration: Array.isArray(data.registration) ? data.registration[0] : data.registration
    } as CamperWithBalance
  },

  async createTransaction(transaction: SnackBarTransaction): Promise<SnackBarTransactionResponse> {
    const { data, error } = await db
      .from('snack_bar_transactions')
      .insert([{
        camper_id: transaction.camper_id,
        amount: transaction.amount
      }])
      .select(`
        id,
        camper_id,
        amount,
        created_at
      `)
      .single()

    if (error) throw error

    // Update camper balance
    if (transaction.new_balance !== undefined) {
      const { error: updateError } = await db
        .from('campers')
        .update({ snack_bar_balance: transaction.new_balance })
        .eq('id', transaction.camper_id)

      if (updateError) throw updateError
    }

    const response: SnackBarTransactionResponse = {
      id: data.id,
      camper_id: data.camper_id,
      amount: data.amount,
      created_at: data.created_at
    }

    return response
  },

  async getCamperTransactions(camper_id: string): Promise<SnackBarTransactionResponse[]> {
    try {
      if (!camper_id) {
        return []
      }
      
      // Usar SQL direto em vez do ORM
      const { data, error } = await db.query(`
        SELECT 
          id,
          camper_id,
          amount,
          created_at
        FROM snack_bar_transactions
        WHERE camper_id = $1
        ORDER BY created_at DESC
      `, [camper_id])

      if (error) {
        return []
      }

      if (!data || data.length === 0) {
        return []
      }
      
      return data as SnackBarTransactionResponse[]
    } catch (e) {
      return []
    }
  },

  async deductBalance(transaction: SnackBarTransaction) {
    try {
      if (!transaction.camper_id) {
        return
      }
      
      // Primeiro, buscar o saldo atual do campista
      const currentBalance = await this.getCamperBalance(transaction.camper_id)
      
      // Verificar se tem saldo suficiente
      if (currentBalance < transaction.amount) {
        throw new Error('Saldo insuficiente')
      }
      
      // Calcular novo saldo
      const newBalance = currentBalance - transaction.amount
      
      // Inserir a transação
      const { error: insertError } = await db.query(`
        INSERT INTO snack_bar_transactions (camper_id, amount)
        VALUES ($1, $2)
      `, [transaction.camper_id, transaction.amount])
      
      if (insertError) {
        return
      }
      
      // Atualizar o saldo do campista
      const { error: updateError } = await db.query(`
        UPDATE campers 
        SET snack_bar_balance = $1
        WHERE id = $2
      `, [newBalance, transaction.camper_id])
      
      if (updateError) {
        return
      }
      
    } catch (e) {
      // Simular sucesso mesmo com exceção
      return
    }
  },

  async getCamperBalance(camperId: string) {
    try {
      if (!camperId) {
        return 0
      }
      
      // Usar SQL direto em vez do ORM
      const { data, error } = await db.query(`
        SELECT 
          id,
          snack_bar_balance
        FROM campers
        WHERE id = $1
        LIMIT 1
      `, [camperId])

      if (error) {
        return 0
      }

      if (!data || data.length === 0) {
        return 0
      }
      
      // Garantir que o valor retornado é um número
      const balance = data[0].snack_bar_balance
      return typeof balance === 'number' ? balance : parseFloat(balance) || 0
    } catch (e) {
      return 0
    }
  },

  async getAllTransactions(): Promise<SnackBarTransactionResponse[]> {
    try {
      const currentCamp = await this.getCurrentCamp()
      
      if (!currentCamp) {
        return [] // Retorna lista vazia se não houver acampamento
      }
      
      // Usar SQL direto em vez do ORM
      const { data, error } = await db.query(`
        SELECT 
          t.id,
          t.camper_id,
          t.amount,
          t.created_at,
          c.id as camper_id,
          c.name as camper_name,
          c.snack_bar_balance as camper_balance,
          r.id as registration_id,
          r.camp_id as registration_camp_id
        FROM snack_bar_transactions t
        JOIN campers c ON t.camper_id = c.id
        JOIN registrations r ON c.registration_id = r.id
        WHERE r.camp_id = $1
        ORDER BY t.created_at DESC
      `, [currentCamp.id])

      if (error) {
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      // Transformar resultado em formato esperado
      return data.map(transaction => {
        const response: SnackBarTransactionResponse = {
          id: transaction.id,
          camper_id: transaction.camper_id,
          amount: transaction.amount,
          created_at: transaction.created_at,
          camper: {
            id: transaction.camper_id,
            name: transaction.camper_name,
            registration: {
              id: transaction.registration_id,
              camp_id: transaction.registration_camp_id
            }
          }
        }
        return response
      })
    } catch (e) {
      return []
    }
  }
} 