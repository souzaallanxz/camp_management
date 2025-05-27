import { config } from 'dotenv'
config()

import { neon } from '@neondatabase/serverless'
import { env } from '../src/env'

const sqlNeon = neon(env.VITE_NEON_DB_URL)

async function main() {
  try {
    // Drop existing table
    await sqlNeon.query(`DROP TABLE IF EXISTS webhook_configs CASCADE`)

    // Create webhook_configs table
    await sqlNeon.query(`
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        api_key TEXT NOT NULL,
        registration_webhook BOOLEAN DEFAULT false,
        payment_webhook BOOLEAN DEFAULT false,
        is_connected BOOLEAN DEFAULT false,
        registration_webhook_url TEXT,
        payment_webhook_url TEXT,
        hookdeck_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id)
      )
    `)

    // Create index
    await sqlNeon.query(`CREATE INDEX IF NOT EXISTS webhook_configs_team_id_idx ON webhook_configs(team_id)`)

    // Create trigger for updated_at
    await sqlNeon.query(`
      DROP TRIGGER IF EXISTS update_webhook_configs_updated_at ON webhook_configs;
      CREATE TRIGGER update_webhook_configs_updated_at
        BEFORE UPDATE ON webhook_configs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)

    console.log('Webhook configs table created successfully!')
  } catch (error) {
    console.error('Error creating webhook_configs table:', error)
    process.exit(1)
  }
}

main() 