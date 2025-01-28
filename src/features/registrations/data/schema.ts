import { z } from 'zod'

export const registrationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  form_id: z.string().nullable(),
  name: z.string(),
  email: z.string().email(),
  contact: z.string(),
  camp: z.string(),
  total_amount_paid: z.number().default(0),
  status: z.enum(['paid', 'partial', 'unpaid']).default('unpaid'),
  created_at: z.string().transform((str) => new Date(str)),
  updated_at: z.string().transform((str) => new Date(str))
})

export type Registration = z.infer<typeof registrationSchema>

export type PaymentMethod = 'MB Way' | 'Transferência Bancária' | 'Dinheiro'

export const paymentSchema = z.object({
  id: z.number(),
  registration_id: z.string().uuid(),
  payment_date: z.string().transform((str) => new Date(str)),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro']),
  amount: z.number(),
  payment_link: z.string().nullable(),
  created_at: z.string().transform((str) => new Date(str)),
  updated_at: z.string().transform((str) => new Date(str))
})

export type Payment = z.infer<typeof paymentSchema>

export const registrationListSchema = z.array(registrationSchema) 