import { neon } from '@neondatabase/serverless'
import { Pool } from '@neondatabase/serverless'

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

// Create a typed query function
export const query = async <T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> => {
  return sql(strings, ...values) as Promise<T[]>
}

// Export the raw sql client for cases where we need it
export { sql } 