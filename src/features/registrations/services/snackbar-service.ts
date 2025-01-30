import { supabase } from '@/lib/supabase'
import { SnackbarBalance } from '../data/schema'

export async function createSnackbarBalance(data: Omit<SnackbarBalance, 'id' | 'created_at' | 'updated_at'>) {
  const { data: snackbarBalance, error } = await supabase
    .from('snackbar_balance')
    .insert(data)
    .select()
    .single()

  if (error) throw error

  return snackbarBalance
}

export async function getSnackbarBalanceByRegistrationId(registrationId: string) {
  const { data: snackbarBalance, error } = await supabase
    .from('snackbar_balance')
    .select('*')
    .eq('registration_id', registrationId)

  if (error) throw error

  return snackbarBalance
}

export async function updateSnackbarBalance(id: string, data: Partial<Omit<SnackbarBalance, 'id' | 'created_at' | 'updated_at'>>) {
  const { data: snackbarBalance, error } = await supabase
    .from('snackbar_balance')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return snackbarBalance
}

export async function deleteSnackbarBalance(id: string) {
  const { error } = await supabase
    .from('snackbar_balance')
    .delete()
    .eq('id', id)

  if (error) throw error
} 