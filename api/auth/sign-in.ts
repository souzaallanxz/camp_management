import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-team-id')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const userResult = await sql`
      SELECT id, email, first_name, last_name, password_hash, team_id 
      FROM public.users 
      WHERE email = ${email}
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Remove password_hash from response
    const userWithoutPassword = { ...user }
    delete userWithoutPassword.password_hash

    return res.status(200).json({
      user: userWithoutPassword,
      session: {
        user: userWithoutPassword,
        token: user.id // Using user ID as token for now
      }
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      database_url_set: !!process.env.DATABASE_URL
    })
  }
} 