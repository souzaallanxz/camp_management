import { z } from 'zod'

export const camperSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  contact: z.string().min(1, 'Contacto é obrigatório'),
  registration_id: z.string().uuid().optional(),
  form_id: z.string().optional().nullable(),
  camp: z.string().optional(),
  additional_notes: z.string().optional().nullable(),
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

export type Camper = z.infer<typeof camperSchema>

export const insertCamperSchema = camperSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export type InsertCamper = z.infer<typeof insertCamperSchema>

export const updateCamperSchema = insertCamperSchema.partial()

export type UpdateCamper = z.infer<typeof updateCamperSchema> 