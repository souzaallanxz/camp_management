import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

// Load environment variables from .env file
config()

const sqlNeon = neon(process.env.VITE_NEON_DB_URL!)

const db = {
  async migrate() {
    try {
      // Set search path
      await sqlNeon.query(`SET search_path TO public`)

      // Create users table in public schema
      await sqlNeon.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create teams table with exact schema
      await sqlNeon.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
          logo_url TEXT,
          tier TEXT NOT NULL DEFAULT 'free'::text CHECK (tier IN ('free', 'premium'))
        )
      `)

      // Create team_members table
      await sqlNeon.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(team_id, user_id)
        )
      `)

      // Create indexes
      await sqlNeon.query(`CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)`)
      await sqlNeon.query(`CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id)`)
      await sqlNeon.query(`CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id)`)

      // Create updated_at trigger function
      await sqlNeon.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = timezone('utc'::text, now());
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `)

      // Create triggers for users
      await sqlNeon.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`)
      await sqlNeon.query(`
        CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `)

      // Create triggers for teams
      await sqlNeon.query(`DROP TRIGGER IF EXISTS update_teams_updated_at ON teams`)
      await sqlNeon.query(`
        CREATE TRIGGER update_teams_updated_at
          BEFORE UPDATE ON teams
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `)

      // Create triggers for team_members
      await sqlNeon.query(`DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members`)
      await sqlNeon.query(`
        CREATE TRIGGER update_team_members_updated_at
          BEFORE UPDATE ON team_members
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `)

      return { error: null }
    } catch (error) {
      return { error }
    }
  }
}

async function main() {

  
  const { error } = await db.migrate()
  
  if (error) {
    process.exit(1)
  }
  process.exit(0)
}

main() 