import { neon } from '@neondatabase/serverless'
import express from 'express'
import bcrypt from 'bcryptjs'
import cors from 'cors'

const app = express()

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL)

// Middleware
app.use(express.json())
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Helper function to get team ID from request
function getTeamId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  return token
}

// === AUTH ROUTES === //

// Sign in route
app.post('/auth/sign-in', async (req, res) => {
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
    console.error('Error in sign-in:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
})

// Get current user route
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Find user by token (which is the user ID)
    const userResult = await sql`
      SELECT id, email, first_name, last_name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Combine first_name and last_name to create the full name
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: fullName || null,
      team_id: user.team_id,
      role: user.role
    })
  } catch (error) {
    console.error('Error in get current user:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
})

// Sign up route
app.post('/auth/sign-up', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' })
    }

    // Check if user already exists
    const existingUserResult = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `

    if (existingUserResult.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const result = await sql`
      INSERT INTO public.users (id, email, first_name, last_name, password_hash)
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword})
      RETURNING id, email, first_name, last_name, team_id
    `

    const user = result[0]

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    return res.status(200).json({
      user,
      session: {
        user,
        token: user.id // Using user ID as token for now
      }
    })
  } catch (error) {
    console.error('Error in sign-up:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
})

// === USER ROUTES === //

// Get user profile
app.get('/users/profile', async (req, res) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await sql`
      SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at
      FROM users
      WHERE id = ${teamId}::uuid
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result[0]
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()

    return res.json({
      ...user,
      name: fullName || null
    })
  } catch (error) {
    console.error('Error getting user profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await sql`
      SELECT * FROM users 
      WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json(result[0])
  } catch (error) {
    console.error('Error getting user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user by ID
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, email, role } = req.body
    const now = new Date().toISOString()

    const fields = []
    if (name !== undefined) fields.push(`first_name = '${name}'`)
    if (email !== undefined) fields.push(`email = '${email}'`)
    if (role !== undefined) fields.push(`role = '${role}'`)
    fields.push(`updated_at = '${now}'`)

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const setClause = fields.join(', ')
    const result = await sql.unsafe(
      `UPDATE users SET ${setClause} WHERE id = $1 AND team_id = $2 RETURNING *`,
      [id, teamId]
    )

    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to update it' })
    }

    return res.json(result[0])
  } catch (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user by ID
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await sql`
      DELETE FROM users 
      WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid 
      RETURNING *
    `

    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to delete it' })
    }

    return res.status(204).end()
  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// === TEAM ROUTES === //

// Get team information
app.get('/teams/info', async (req, res) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await sql`
      SELECT t.*, u.email as owner_email
      FROM teams t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE t.id = ${teamId}::uuid
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    return res.json(result[0])
  } catch (error) {
    console.error('Error getting team info:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Export the Express app
export default app