import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function createUsersTable() {
  try {
    console.log('Creating users table...')

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        team_id UUID REFERENCES teams(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create index on email
    await sql`
      CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)
    `

    // Create updated_at trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_users_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `
    await sql`
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_users_updated_at()
    `

    console.log('users table created successfully!')
  } catch (error) {
    console.error('Error creating users table:', error)
    process.exit(1)
  }
}

createUsersTable() 