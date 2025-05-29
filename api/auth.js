import { neon } from '@neondatabase/serverless'
import express from 'express'
import bcrypt from 'bcryptjs'

const router = express.Router()

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL)

// Sign in route
router.post('/sign-in', async (req, res) => {
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
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Validate token format
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

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
router.post('/sign-up', async (req, res) => {
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

export default router 