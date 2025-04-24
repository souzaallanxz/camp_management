import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function createUsersSyncTable() {
  try {

    // Create users_sync table
    await sql`
      CREATE TABLE IF NOT EXISTS users_sync (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        raw_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create index on email
    await sql`
      CREATE INDEX IF NOT EXISTS users_sync_email_idx ON users_sync(email)
    `

    // Create updated_at trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_users_sync_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    // Drop existing trigger if exists
    await sql`
      DROP TRIGGER IF EXISTS update_users_sync_updated_at ON users_sync
    `

    // Create trigger
    await sql`
      CREATE TRIGGER update_users_sync_updated_at
        BEFORE UPDATE ON users_sync
        FOR EACH ROW
        EXECUTE FUNCTION update_users_sync_updated_at()
    `

  } catch (error) {
    process.exit(1)
  }
}

createUsersSyncTable() 