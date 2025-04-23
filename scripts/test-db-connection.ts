import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function testDbConnection() {
  try {
    console.log('Testing database connection...')

    // Check user_teams table structure
    const userTeamsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'user_teams'
    `
    console.log('user_teams columns:', userTeamsColumns)

    // Check if users_sync table exists and its structure
    const usersSyncColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'users_sync'
    `
    console.log('users_sync columns:', usersSyncColumns)

    // Try to get constraint information
    const constraints = await sql`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = 'user_teams'
    `
    console.log('Constraints:', constraints)

    console.log('Test completed successfully!')
  } catch (error) {
    console.error('Error testing database connection:', error)
    process.exit(1)
  }
}

testDbConnection() 