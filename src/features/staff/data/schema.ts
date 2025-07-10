import { z } from 'zod'

export const staffSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  camp_id: z.string().uuid('ID do acampamento é obrigatório'),
  camp_name: z.string().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  total_balance: z.number().or(z.string()).default(0),
})

export type Staff = z.infer<typeof staffSchema>

export const insertStaffSchema = staffSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  camp_name: true,
  total_balance: true,
})

export type InsertStaff = z.infer<typeof insertStaffSchema>

export const updateStaffSchema = insertStaffSchema.partial()

export type UpdateStaff = z.infer<typeof updateStaffSchema> 