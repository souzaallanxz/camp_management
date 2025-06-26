import { neon } from '@neondatabase/serverless'

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-team-id')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    // Extract token from header (assuming Bearer token format)
    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Find user by token (using user ID as token for now)
    const userResult = await sql`
      SELECT id, email, first_name, last_name, team_id 
      FROM public.users 
      WHERE id = ${token}
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    return res.status(200).json({
      user: user
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 