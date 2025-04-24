import { db } from '@/lib/neon-db'

async function runMigrations() {
  
  const { error } = await db.migrate()
  
  if (error) {
    process.exit(1)
  }
  
  process.exit(0)
}

runMigrations().catch(error => {
  process.exit(1)
}) 