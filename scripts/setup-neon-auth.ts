import { neon } from '@neondatabase/serverless'
import { env } from '../src/env'

// Create a Neon database client
const sqlNeon = neon(env.VITE_NEON_DB_URL)

async function setupNeonAuth() {
  try {
    // Check if neon_auth schema exists
    const { data: schemaExists, error: schemaError } = await sqlNeon.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth'
      )`
    )

    if (schemaError) {
      throw schemaError
    }

    if (!schemaExists || !schemaExists[0].exists) {
      return
    }

    // Check if users_sync table exists
    const { data: tableExists, error: tableError } = await sqlNeon.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
      )`
    )

    if (tableError) {
      throw tableError
    }

    if (!tableExists || !tableExists[0].exists) {
      return
    }

    // Create a test user in neon_auth.users_sync
    // Note: In a real implementation, this would be done through the Neon Auth API
    // This is just a simulation for development purposes
    const { error: insertError } = await sqlNeon.query(
      `INSERT INTO neon_auth.users_sync (id, email, name, raw_json, created_at)
       VALUES (
         'test-user-id',
         'test@example.com',
         'Test User',
         '{"id": "test-user-id", "email": "test@example.com", "name": "Test User", "password": "password123"}',
         NOW()
       )
       ON CONFLICT (id) DO NOTHING
       RETURNING id`
    )

    if (insertError) {
      throw insertError
    }

    // Create a test team
    const { data: teamData, error: teamError } = await sqlNeon.query(
      `INSERT INTO public.teams (name, tier)
       VALUES ('Test Team', 'free')
       ON CONFLICT DO NOTHING
       RETURNING id`
    )

    if (teamError) {
      throw teamError
    }

    if (teamData && teamData.length > 0) {
      const teamId = teamData[0].id

      // Associate the test user with the test team
      const { error: userTeamError } = await sqlNeon.query(
        `INSERT INTO public.user_teams (user_id, team_id, role)
         VALUES ('test-user-id', $1, 'owner')
         ON CONFLICT (user_id, team_id) DO NOTHING`,
        [teamId]
      )

      if (userTeamError) {
        throw userTeamError
      }
    }

  } catch (error) {
    process.exit(1)
  }
}

// Run the setup
setupNeonAuth()