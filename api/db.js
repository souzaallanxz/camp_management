import { neon } from '@neondatabase/serverless'

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL)

// Create a typed query function
export const query = async (strings, ...values) => {
  return sql(strings, ...values)
}

// Export the raw sql client for cases where we need it
export { sql } 