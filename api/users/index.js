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
      const { name, firstName, lastName, email, role } = req.body;
      const fullName = name || ((firstName && lastName) ? `${firstName} ${lastName}` : null);
      if (!fullName || !email || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const now = new Date().toISOString();
      const result = await sqlVercel`
        INSERT INTO users (name, email, role, team_id, created_at, updated_at)
        VALUES (${fullName}, ${email}, ${role}, ${teamId}, ${now}, ${now})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch {
      return res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 