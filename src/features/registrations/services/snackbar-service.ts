import { supabase } from '@/lib/supabase'
import type { SnackBarTransaction } from '../data/schema'

export async function getCampCampers(campId: string) {
  const { data, error } = await supabase
    .rpc('get_camp_campers', { p_camp_id: campId })

  if (error) {
    throw new Error(`Error fetching campers: ${error.message}`)
  }

  return data || []
}

export async function getCampTransactions(campId: string) {
  const { data, error } = await supabase
    .rpc('get_camp_snackbar_transactions', { p_camp_id: campId })

  if (error) {
    throw new Error(`Error fetching transactions: ${error.message}`)
  }

  return data || []
}

export async function createTransaction(transaction: Omit<SnackBarTransaction, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('snack_bar_transactions')
    .insert({
      ...transaction,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Error creating transaction: ${error.message}`)
  }

  return data
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from('snack_bar_transactions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Error deleting transaction: ${error.message}`)
  }
}

export const snackbarService = {
  getCampCampers,
  getCampTransactions,
  createTransaction,
  deleteTransaction
} 