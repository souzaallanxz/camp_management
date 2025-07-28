import { z } from 'zod'
import { type Camper } from '@/features/campers/data/schema'
import { type Camp } from '@/features/camps/data/schema'

export const registrationSchema = z.object({
  id: z.string().uuid(),
  camp_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  contact: z.string().min(1, 'Contacto é obrigatório'),
  status: z.enum(['unpaid', 'partial', 'paid']),
  onboarding_status: z.enum(['Pendente', 'Onboarded']),
  form_id: z.string().optional().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  id_number: z.string().optional().nullable(),
  sns_number: z.string().optional().nullable(),
  date_of_birth: z.string().or(z.date()).optional().nullable(),
  dietary_restrictions: z.string().optional().nullable(),
  guardian_name: z.string().optional().nullable(),
  guardian_email: z.string().email('Email inválido').optional().nullable(),
  guardian_phone: z.string().optional().nullable(),
})

export interface Registration extends z.infer<typeof registrationSchema> {
  camp: Camp | null
  camper: Camper | null
  total_paid?: number
}

export const insertRegistrationSchema = registrationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  onboarding_status: true,
  status: true,
})

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>

export const updateRegistrationSchema = registrationSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .partial()

export type UpdateRegistration = z.infer<typeof updateRegistrationSchema>

export type PaymentMethod = 'MB Way' | 'Transferência Bancária' | 'Dinheiro' | 'Desconto' | 'Multibanco'
export type PaymentStatus = 'confirmed' | 'not confirmed' | 'expired'

export const paymentSchema = z.object({
  id: z.number(),
  registration_id: z.string().uuid(),
  payment_date: z.string(),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro', 'Desconto', 'Multibanco']),
  payment_status: z.enum(['confirmed', 'not confirmed', 'expired']),
  amount: z.number(),
  payment_link: z.string().nullable(),
  phone_number: z.string().nullable(),
  request_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export type Payment = z.infer<typeof paymentSchema>

export const registrationListSchema = z.array(registrationSchema)

export const snackbarBalanceSchema = z.object({
  id: z.string().uuid(),
  registration_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  amount: z.number(),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro', 'Multibanco']),
  phone_number: z.string().nullable(),
  request_id: z.string().nullable(),
  created_at: z.string().transform((str) => new Date(str)),
  updated_at: z.string().transform((str) => new Date(str))
})

export type SnackbarBalance = z.infer<typeof snackbarBalanceSchema>

export const snackBarTransactionSchema = z.object({
  id: z.string().uuid(),
  camper_id: z.string().uuid(),
  amount: z.number(),
  type: z.enum(['credit', 'debit']),
  description: z.string().optional().nullable(),
  is_liquidated: z.boolean().default(false),
  created_at: z.string().or(z.date())
})

export type SnackBarTransaction = z.infer<typeof snackBarTransactionSchema> 