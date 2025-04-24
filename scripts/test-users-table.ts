import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function testUsersTable() {
  try {
    // Check users table structure
    console.log('Checking users table structure:')
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `
    console.table(usersColumns)

    // Check user_status_type enum values
    console.log('\nChecking status column type:')
    const statusType = await sql`
      SELECT 
        column_name, 
        data_type, 
        udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `
    console.table(statusType)

    // Check role column type
    console.log('\nChecking role column type:')
    const roleType = await sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `
    console.table(roleType)

    // Get user sample data
    console.log('\nSample data from users table:')
    const users = await sql`
      SELECT 
        id, 
        email, 
        name, 
        team_id, 
        first_name, 
        last_name, 
        username, 
        phone_number, 
        status, 
        role
      FROM users
      LIMIT 5
    `
    console.table(users)

    console.log('\nTest completed successfully')
  } catch (error) {
    console.error('Error testing users table:', error)
    process.exit(1)
  }
}

testUsersTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  }) 