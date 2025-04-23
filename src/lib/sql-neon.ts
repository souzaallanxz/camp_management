import { neon } from '@neondatabase/serverless'
import { env } from '@/env'

const sql = neon(env.VITE_NEON_DB_URL)

export const sqlNeon = sql 