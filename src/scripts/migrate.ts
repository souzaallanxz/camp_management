import { db } from '@/lib/neon-db'

async function runMigrations() {
  console.log('Running database migrations...')
  
  const { error } = await db.migrate()
  
  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  
  console.log('Migrations completed successfully!')
  process.exit(0)
}

runMigrations().catch(error => {
  console.error('Unhandled error during migration:', error)
  process.exit(1)
}) 