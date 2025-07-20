import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function addRoleToUsers() {
  try {
    
    // Add role column to users table if it doesn't exist
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'contributor';
          RAISE NOTICE 'Role column added to users table';
        ELSE
          RAISE NOTICE 'Role column already exists in users table';
        END IF;
      END
      $$; 
    `

    
    // Verify the column was added
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `

  } catch (error) {
    process.exit(1)
  }
}

addRoleToUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    process.exit(1)
  }) 