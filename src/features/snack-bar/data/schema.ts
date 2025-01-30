import { z } from 'zod'

export const snackBarTransactionSchema = z.object({
  camperId: z.string(),
  amount: z.number().positive(),
})

export const snackBarTransactionResponseSchema = z.object({
  id: z.string(),
  camper_id: z.string(),
  amount: z.number(),
  created_at: z.string(),
})

export type SnackBarTransaction = z.infer<typeof snackBarTransactionSchema>
export type SnackBarTransactionResponse = z.infer<typeof snackBarTransactionResponseSchema>

export interface SnackBarBalance {
  amount: number
}

export interface CamperRegistration {
  id: string
  snackbar_balance: SnackBarBalance[]
}

export interface CamperWithBalance {
  id: string
  registration: CamperRegistration
} 