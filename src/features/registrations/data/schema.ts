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
})

export interface Registration extends z.infer<typeof registrationSchema> {
  camp: Camp | null
  camper: Camper | null
  total_amount_paid?: number
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

export type PaymentMethod = 'MB Way' | 'Transferência Bancária' | 'Dinheiro'
export type PaymentStatus = 'confirmed' | 'not confirmed'

export interface Payment {
  id: number
  registration_id: string
  payment_date: string
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount: number
  payment_link: string | null
  phone_number: string | null
  created_at: string
  updated_at: string
}

export const paymentSchema = z.object({
  id: z.number(),
  registration_id: z.string().uuid(),
  payment_date: z.string(),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro']),
  amount: z.number(),
  payment_link: z.string().nullable(),
  phone_number: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export type Payment = z.infer<typeof paymentSchema>

export const registrationListSchema = z.array(registrationSchema)

export const snackbarBalanceSchema = z.object({
  id: z.string().uuid(),
  registration_id: z.string().uuid(),
  amount: z.number(),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro']),
  phone_number: z.string().nullable(),
  created_at: z.string().transform((str) => new Date(str)),
  updated_at: z.string().transform((str) => new Date(str))
})

export type SnackbarBalance = z.infer<typeof snackbarBalanceSchema> 