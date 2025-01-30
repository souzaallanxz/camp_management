import { supabase } from '@/lib/supabase'
import type { 
  SnackBarTransaction, 
  SnackBarTransactionResponse,
  CamperWithBalance
} from '../data/schema'

export const snackBarService = {
  async getCurrentCamp() {
    const today = new Date().toISOString()
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .single()

    if (error) throw error
    return data
  },

  async getCampers() {
    const currentCamp = await this.getCurrentCamp()
    
    const { data, error } = await supabase
      .from('campers')
      .select(`
        id,
        name,
        registration:registration_id!inner (
          id,
          camp_id
        )
      `)
      .eq('registration.camp_id', currentCamp.id)
      .order('name')

    if (error) throw error
    return data
  },

  async deductBalance(transaction: SnackBarTransaction) {
    const { error } = await supabase.rpc('deduct_snack_bar_balance', {
      p_camper_id: transaction.camperId,
      p_amount: transaction.amount,
    })

    if (error) throw error
  },

  async getCamperBalance(camperId: string) {
    const { data, error } = await supabase
      .from('campers')
      .select(`
        id,
        registration:registration_id!inner (
          id,
          snackbar_balance (
            amount
          )
        )
      `)
      .eq('id', camperId)
      .single()

    if (error) throw error

    const camperData = data as CamperWithBalance

    // Sum all balance records
    const totalBalance = camperData?.registration?.snackbar_balance?.reduce(
      (sum: number, balance) => sum + Number(balance.amount),
      0
    ) ?? 0

    return totalBalance
  },

  async getCamperTransactions(camperId: string) {
    const { data, error } = await supabase
      .from('snack_bar_transactions')
      .select(`
        id,
        camper_id,
        amount,
        created_at
      `)
      .eq('camper_id', camperId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as SnackBarTransactionResponse[]
  },

  async getAllTransactions() {
    const currentCamp = await this.getCurrentCamp()
    
    const { data, error } = await supabase
      .from('snack_bar_transactions')
      .select(`
        id,
        camper_id,
        amount,
        created_at,
        campers!fk_camper (
          registration:registration_id (
            camp_id
          )
        )
      `)
      .eq('campers.registration.camp_id', currentCamp.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as SnackBarTransactionResponse[]
  },
} 