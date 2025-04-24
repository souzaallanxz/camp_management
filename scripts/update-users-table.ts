import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function updateUsersTable() {
  try {
    // Create enum for user status if it doesn't exist
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_type') THEN
          CREATE TYPE user_status_type AS ENUM ('active', 'inactive', 'invited', 'suspended');
        END IF;
      END
      $$;
    `

    // We won't create a new user_role_type as there's already a VARCHAR role column
    // Instead we'll just use the existing role column
    
    // Add columns to users table if they don't exist
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
          ALTER TABLE users ADD COLUMN first_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
          ALTER TABLE users ADD COLUMN last_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
          ALTER TABLE users ADD COLUMN username TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
          ALTER TABLE users ADD COLUMN phone_number TEXT;
        END IF;
        
        -- Status column is already defined correctly, we don't need to add it again
      END
      $$;
    `

    console.log('Users table updated successfully')
  } catch (error) {
    console.error('Error updating users table:', error)
    process.exit(1)
  }
}

updateUsersTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  }) 