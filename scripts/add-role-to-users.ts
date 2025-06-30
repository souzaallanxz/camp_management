import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function addRoleToUsers() {
  try {
    console.log('Adding role column to users table...')
    
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

    console.log('Role column added successfully!')
    
    // Verify the column was added
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default  
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `
    
    if (columns.length > 0) {
      console.log('Role column verification:')
      console.table(columns)
    } else {
      console.log('Role column not found after addition')
    }

  } catch (error) {
    console.error('Error adding role column:', error)
    process.exit(1)
  }
}

addRoleToUsers()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 