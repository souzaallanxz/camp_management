import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function addLanguageToUsers() {
  try {
    console.log('Adding language column to users table...')

    // Add language column to users table
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt'
    `

    console.log('✅ Language column added successfully!')
    console.log('Default language set to "pt" (Portuguese)')

  } catch (error) {
    console.error('❌ Error adding language column:', error)
    process.exit(1)
  }
}

addLanguageToUsers() 