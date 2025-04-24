import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config()

const sql = neon(process.env.VITE_NEON_DB_URL!)

async function fixUserTeam() {
  try {
    console.log('Iniciando correção de time_id dos usuários...');
    
    // 1. Verificar se existe pelo menos um time
    const teamsResult = await sql`SELECT id FROM teams LIMIT 1`
    
    let teamId;
    
    // Se não existe time, criar um
    if (!teamsResult || teamsResult.length === 0) {
      console.log('Nenhum time encontrado. Criando time padrão...');
      const newTeamResult = await sql`
        INSERT INTO teams (name) 
        VALUES ('Default Team') 
        RETURNING id
      `
      teamId = newTeamResult[0].id;
      console.log(`Time padrão criado com ID: ${teamId}`);
    } else {
      teamId = teamsResult[0].id;
      console.log(`Time existente encontrado com ID: ${teamId}`);
    }
    
    // 2. Atualizar o team_id de todos os usuários
    const updateResult = await sql`
      UPDATE users
      SET team_id = ${teamId}::uuid
      WHERE team_id IS NULL OR team_id != ${teamId}::uuid
      RETURNING id, email
    `
    
    console.log(`Atualizados ${updateResult.length} usuários:`);
    updateResult.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });
    
    // 3. Verificar se o usuário souzaallanxz@gmail.com existe e atualizar
    const allanUserResult = await sql`
      SELECT id, email, team_id FROM users 
      WHERE email = 'souzaallanxz@gmail.com'
    `
    
    if (allanUserResult && allanUserResult.length > 0) {
      console.log(`\nUsuário souzaallanxz@gmail.com encontrado:`);
      console.log(`- ID: ${allanUserResult[0].id}`);
      console.log(`- Team ID: ${allanUserResult[0].team_id}`);
      
      if (allanUserResult[0].team_id !== teamId) {
        await sql`
          UPDATE users
          SET team_id = ${teamId}::uuid
          WHERE email = 'souzaallanxz@gmail.com'
        `
        console.log(`- Team ID atualizado para: ${teamId}`);
      } else {
        console.log(`- Team ID já está correto`);
      }
    } else {
      console.log(`\nUsuário souzaallanxz@gmail.com não encontrado.`);
    }
    
    console.log('\nCorreção concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao corrigir time_id dos usuários:', error);
    process.exit(1);
  }
}

fixUserTeam()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  }); 