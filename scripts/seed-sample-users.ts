import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function seedSampleUsers() {
  try {
    
    // First check how many users already exist
    const countResult = await sql`SELECT COUNT(*) as count FROM users`
    const existingCount = parseInt(countResult[0]?.count || '0')
    
    
    if (existingCount > 0) {
      const shouldContinue = process.argv.includes('--force')
      
      if (!shouldContinue) {
        return
      }
      
    }
    
    // Find teams to use for the sample users
    const teamsResult = await sql`SELECT id FROM teams LIMIT 1`
    
    if (!teamsResult || teamsResult.length === 0) {
      const defaultTeamResult = await sql`
        INSERT INTO teams (name) 
        VALUES ('Default Team') 
        RETURNING id
      `
      teamsResult.push(defaultTeamResult[0])
    }
    
    const teamId = teamsResult[0]?.id
    
    if (!teamId) {
      return
    }
    
    // Generate and insert 10 sample users
    const usersToInsert = 10
    
    const salt = await bcrypt.genSalt(10)
    const defaultPassword = await bcrypt.hash('password123', salt)
    
    for (let i = 0; i < usersToInsert; i++) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const username = faker.internet.userName({ firstName, lastName }).toLowerCase()
      const email = faker.internet.email({ firstName, lastName }).toLowerCase()
      
      await sql`
        INSERT INTO users (
          email,
          password_hash,
          name,
          team_id,
          first_name,
          last_name,
          username,
          phone_number,
          status,
          role
        ) VALUES (
          ${email},
          ${defaultPassword},
          ${firstName + ' ' + lastName},
          ${teamId}::uuid,
          ${firstName},
          ${lastName},
          ${username},
          ${faker.phone.number()},
          'active',
          ${faker.helpers.arrayElement(['admin', 'contributor', 'manager', 'cashier'])}
        )
        ON CONFLICT (email) DO NOTHING
      `
    }
    
    
  } catch (error) {
    process.exit(1)
  }
}

seedSampleUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    process.exit(1)
  }) 