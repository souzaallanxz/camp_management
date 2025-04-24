import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function debugUsers() {
  try {
    // Get current user team ID (using token from localStorage in a real app)
    console.log('1. Checking for current user and team')
    const tokenFromParams = process.argv[2] // Optional command line parameter for token
    const token = tokenFromParams || 'test-token' // You'll need to pass a real token when running this script
    
    console.log(`Using token: ${token}`)

    // Check users table columns
    console.log('\n2. Checking users table structure:')
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `
    console.table(usersColumns)

    // Count total users
    console.log('\n3. Counting total users:')
    const totalUsers = await sql`
      SELECT COUNT(*) as total_users FROM users
    `
    console.log(`Total users in database: ${totalUsers[0]?.total_users || 0}`)

    // Get user by token
    if (token) {
      console.log('\n4. Attempting to find user by token:')
      const userResult = await sql`
        SELECT id, email, name, team_id FROM users
        WHERE id = ${token}::uuid
      `
      
      if (userResult && userResult.length > 0) {
        console.log('User found:')
        console.log(userResult[0])
        
        const userTeamId = userResult[0].team_id
        
        if (userTeamId) {
          console.log('\n5. Checking users in the same team:')
          const teamUsers = await sql`
            SELECT id, email, name FROM users
            WHERE team_id = ${userTeamId}::uuid
          `
          console.log(`Found ${teamUsers.length} users in the same team:`)
          console.table(teamUsers)
        } else {
          console.log('User has no team_id assigned')
        }
      } else {
        console.log('No user found with the provided token')
      }
    }
    
    // Sample all users (limit to 10)
    console.log('\n6. Sample users data (max 10):')
    const sampleUsers = await sql`
      SELECT id, email, name, team_id FROM users
      LIMIT 10
    `
    console.table(sampleUsers)

    // Team information
    console.log('\n7. Available teams:')
    const teams = await sql`
      SELECT id, name FROM teams
    `
    console.table(teams)

    console.log('\nDebug completed')
  } catch (error) {
    console.error('Error debugging users:', error)
  }
}

// Run the debug function with a token parameter if provided
debugUsers() 