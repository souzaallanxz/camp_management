import { z } from 'zod'

export const snackBarTransactionSchema = z.object({
  camper_id: z.string(),
  amount: z.string()
    .min(1, 'O valor é obrigatório')
    .refine((val) => !isNaN(Number(val)), 'Valor inválido')
    .refine((val) => Number(val) >= 0.01, 'O valor deve ser maior que zero')
    .transform((val) => Number(val)),
  new_balance: z.number().optional()
})

export const snackBarTransactionResponseSchema = z.object({
  id: z.string(),
  camper_id: z.string(),
  amount: z.number(),
  created_at: z.string(),
  camper: z.object({
    id: z.string(),
    name: z.string(),
    registration: z.object({
      id: z.string(),
      camp_id: z.string()
    })
  }).optional()
})

export type SnackBarTransaction = z.infer<typeof snackBarTransactionSchema>
export type SnackBarTransactionResponse = z.infer<typeof snackBarTransactionResponseSchema>

export interface CamperWithBalance {
  id: string
  name: string
  snack_bar_balance: number
  registration: {
    id: string
    camp_id: string
  }
} 