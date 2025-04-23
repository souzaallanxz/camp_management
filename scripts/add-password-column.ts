import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function addPasswordColumn() {
  try {
    // Verificar se a coluna já existe
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        AND column_name = 'password_hash'
      )
    `
    
    const exists = columnExists[0]?.exists || false
    
    if (exists) {
      console.log('A coluna password_hash já existe na tabela users')
      return
    }
    
    // Adicionar a coluna password_hash
    await sql`
      ALTER TABLE public.users 
      ADD COLUMN password_hash TEXT
    `
    
    console.log('Coluna password_hash adicionada com sucesso à tabela users')
  } catch (error) {
    console.error('Erro ao adicionar coluna password_hash:', error)
    process.exit(1)
  }
}

addPasswordColumn() 