import { z } from 'zod'

export const campSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  start_date: z.string(),
  end_date: z.string(),
  price: z.number().or(z.string()),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})

export type Camp = z.infer<typeof campSchema>

export const insertCampSchema = campSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export type InsertCamp = z.infer<typeof insertCampSchema>

export const updateCampSchema = insertCampSchema.partial()

export type UpdateCamp = z.infer<typeof updateCampSchema> 