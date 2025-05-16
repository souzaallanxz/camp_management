import { neon } from '@neondatabase/serverless';
const sqlVercel = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const teamId = req.headers['x-team-id'];
  if (!teamId) return res.status(401).json({ error: 'Missing x-team-id header' });

  if (req.method === 'GET') {
    try {
      const users = await sqlVercel`SELECT * FROM users WHERE team_id = ${teamId} ORDER BY created_at DESC`;
      return res.json(users);
    } catch {
      return res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, role } = req.body;

      // Validação dos campos obrigatórios
      if (!firstName || !lastName || !email || !role) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: { firstName, lastName, email, role }
        });
      }

      // Validação do formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validação do role
      const validRoles = ['superadmin', 'admin', 'contributor', 'cashier', 'manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role',
          validRoles
        });
      }

      // Verificar se o email já existe
      const existingUser = await sqlVercel`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const now = new Date().toISOString();
      const result = await sqlVercel`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          role, 
          team_id, 
          created_at, 
          updated_at
        ) VALUES (
          ${firstName}, 
          ${lastName}, 
          ${email}, 
          ${role}, 
          ${teamId}, 
          ${now}, 
          ${now}
        ) RETURNING *
      `;

      if (!result || result.length === 0) {
        throw new Error('Failed to create user - no result returned');
      }

      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ 
        error: 'Error creating user',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 