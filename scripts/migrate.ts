import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';
import { env } from '../src/env';

  VITE_NEON_DB_URL: process.env.VITE_NEON_DB_URL,
  NODE_ENV: process.env.NODE_ENV
});

const sqlNeon = neon(env.VITE_NEON_DB_URL);

async function main() {
  try {

    // Set search path to public
    await sqlNeon.query(`SET search_path TO public`);

    // Create teams table
    await sqlNeon.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        logo_url TEXT,
        tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_teams table to associate users with teams
    await sqlNeon.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, team_id)
      )
    `);

    // Create indexes
    await sqlNeon.query(`CREATE INDEX IF NOT EXISTS user_teams_user_id_idx ON user_teams(user_id)`);
    await sqlNeon.query(`CREATE INDEX IF NOT EXISTS user_teams_team_id_idx ON user_teams(team_id)`);

    // Create updated_at trigger function
    await sqlNeon.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers for teams
    await sqlNeon.query(`
      DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
      CREATE TRIGGER update_teams_updated_at
        BEFORE UPDATE ON teams
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create triggers for user_teams
    await sqlNeon.query(`
      DROP TRIGGER IF EXISTS update_user_teams_updated_at ON user_teams;
      CREATE TRIGGER update_user_teams_updated_at
        BEFORE UPDATE ON user_teams
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Check if neon_auth schema exists
    const { data: schemaExists, error: schemaError } = await sqlNeon.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth'
      )`
    );

    if (schemaError) {
      throw schemaError;
    }

    if (!schemaExists || !schemaExists[0].exists) {
      process.exit(1);
    } else {
      // Check if users_sync table exists
      const { data: tableExists, error: tableError } = await sqlNeon.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
        )`
      );

      if (tableError) {
        throw tableError;
      }

      if (!tableExists || !tableExists[0].exists) {
        process.exit(1);
      } else {
        // Add foreign key constraint to user_teams.user_id if it doesn't exist
        try {
          await sqlNeon.query(`
            ALTER TABLE user_teams 
            ADD CONSTRAINT user_teams_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES neon_auth.users_sync(id) 
            ON DELETE CASCADE
          `);
        } catch (error) {
          // Ignore error if constraint already exists
        }
      }
    }

  } catch (error) {
    process.exit(1);
  }
}

main();