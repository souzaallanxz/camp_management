import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string(),
  VITE_MBWAY_KEY: z.string(),
  VITE_IFTHENPAY_MERCHANT_ID: z.string().optional(),
  VITE_APP_URL: z.string().url().optional(),
})

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_MBWAY_KEY: import.meta.env.VITE_MBWAY_KEY,
  VITE_IFTHENPAY_MERCHANT_ID: import.meta.env.VITE_IFTHENPAY_MERCHANT_ID,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
}) 