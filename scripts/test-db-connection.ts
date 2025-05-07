import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    process.exit(1)
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Test the connection
    const result = await sql`SELECT NOW()`
    console.log('Database connection successful:', result[0])

    // Test users table
    const users = await sql`
      SELECT COUNT(*) as count 
      FROM public.users
    `
    console.log('Users table accessible. Count:', users[0].count)

  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

testConnection() 