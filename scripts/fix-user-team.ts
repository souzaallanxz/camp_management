import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function fixUserTeam() {
  try {
    
    // 1. Verificar se existe pelo menos um time
    const teamsResult = await sql`SELECT id FROM teams LIMIT 1`
    
    let teamId;
    
    // Se não existe time, criar um
    if (!teamsResult || teamsResult.length === 0) {
      const newTeamResult = await sql`
        INSERT INTO teams (name) 
        VALUES ('Default Team') 
        RETURNING id
      `
      teamId = newTeamResult[0].id;
    } else {
      teamId = teamsResult[0].id;    
    }
    
    // 2. Atualizar o team_id de todos os usuários
    const updateResult = await sql`
      UPDATE users
      SET team_id = ${teamId}::uuid
      WHERE team_id IS NULL OR team_id != ${teamId}::uuid
      RETURNING id, email
    `
    
    updateResult.forEach(user => {
    });
    
  } catch (error) {
    process.exit(1);
  }
}

fixUserTeam()
  .then(() => process.exit(0))
  .catch((error) => {
    process.exit(1);
  }); 