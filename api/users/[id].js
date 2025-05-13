import { neon } from '@neondatabase/serverless';
const sqlVercel = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { id } = req.query;
  const teamId = req.headers['x-team-id'];
  if (!teamId) return res.status(401).json({ error: 'Missing x-team-id header' });

  if (req.method === 'PUT') {
    try {
      const { name, email, role } = req.body;
      const now = new Date().toISOString();
      const fields = [];
      if (name !== undefined) fields.push(`name = '${name}'`);
      if (email !== undefined) fields.push(`email = '${email}'`);
      if (role !== undefined) fields.push(`role = '${role}'`);
      fields.push(`updated_at = '${now}'`);
      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
      const setClause = fields.join(', ');
      const result = await sqlVercel.unsafe(
        `UPDATE users SET ${setClause} WHERE id = $1 AND team_id = $2 RETURNING *`,
        [id, teamId]
      );
      if (!result[0]) return res.status(404).json({ error: 'User not found or you do not have permission to update it' });
      return res.json(result[0]);
    } catch {
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
  }

  if (req.method === 'GET') {
    try {
      const result = await sqlVercel`SELECT * FROM users WHERE id = ${id} AND team_id = ${teamId}`;
      if (result.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json(result[0]);
    } catch {
      return res.status(500).json({ error: 'Erro ao buscar usuário.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sqlVercel`DELETE FROM users WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
      if (!result[0]) return res.status(404).json({ error: 'User not found or you do not have permission to delete it' });
      return res.status(204).end();
    } catch {
      return res.status(500).json({ error: 'Erro ao deletar usuário.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 