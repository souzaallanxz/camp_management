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

// === WEBHOOK ROUTES === //

// Helper function to validate webhook payload for registrations
function validateRegistrationPayload(payload) {
  const errors = []
  
  if (!payload.name) errors.push('name is required')
  if (!payload.email) errors.push('email is required')
  if (!payload.contact) errors.push('contact is required')
  
  return errors
}

// Helper function to map webhook payload to registration fields
function mapRegistrationPayload(payload, userId) {
  return {
    id: payload.id || null, // UUID will be generated if not provided
    form_id: payload.form_id || null,
    name: payload.name,
    email: payload.email,
    contact: payload.contact,
    status: payload.status || 'unpaid',
    user_id: userId,
    camp_id: payload.camp_id || null,
    onboarding_status: payload.onboarding_status || 'Pendente',
    snack_bar_balance: payload.snack_bar_balance || 0.00,
    total_amount_paid: payload.total_amount_paid || 0,
    id_number: payload.id_number || null,
    sns_number: payload.sns_number || null,
    date_of_birth: payload.date_of_birth || null,
    dietary_restrictions: payload.dietary_restrictions || null,
    guardian_name: payload.guardian_name || null,
    guardian_email: payload.guardian_email || null,
    guardian_phone: payload.guardian_phone || null
  }
}

// Helper function to make Hookdeck API calls
async function makeHookdeckRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.hookdeck.com/2025-01-01${endpoint}`
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.HOOKDECK_API_KEY}`,
      'Content-Type': 'application/json',
    }
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  console.log(`[Hookdeck] ${method} ${url}`)
  console.log(`[Hookdeck] Body:`, JSON.stringify(body, null, 2))
  
  const response = await fetch(url, options)
  const responseText = await response.text()
  
  console.log(`[Hookdeck] Response status:`, response.status)
  console.log(`[Hookdeck] Response:`, responseText)
  
  if (!response.ok) {
    throw new Error(`Hookdeck API error: ${response.status} ${response.statusText} - ${responseText}`)
  }
  
  return JSON.parse(responseText)
}

// Setup webhook endpoint
app.post('/api/webhooks/setup', async (req, res) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { webhookType } = req.body
    
    if (!webhookType || !['registrations', 'payments'].includes(webhookType)) {
      return res.status(400).json({ error: 'Invalid webhook type. Must be "registrations" or "payments"' })
    }

    // Step 1: Create destination
    const destination = await makeHookdeckRequest('/destinations', 'POST', {
      name: `Webhook ${webhookType} para User ${teamId}`,
      url: `${req.protocol}://${req.get('host')}/api/webhooks/${webhookType}/${teamId}`
    })

    // Step 2: Create source (name e type são obrigatórios, mas API também exige alias e label)
    const source = await makeHookdeckRequest('/sources', 'POST', {
      name: `${webhookType}-user-${teamId}`,
      type: 'WEBHOOK',
      alias: `${webhookType}-user-${teamId}`,
      label: `${webhookType.charAt(0).toUpperCase() + webhookType.slice(1)} Webhook`
    })

    // Step 3: Create connection
    const connection = await makeHookdeckRequest('/connections', 'POST', {
      source_id: source.id,
      destination_id: destination.id
    })

    return res.status(200).json({
      success: true,
      webhookUrl: source.url,
      destination,
      source,
      connection
    })

  } catch (error) {
    console.error('Error setting up webhook:', error)
    return res.status(500).json({ 
      error: 'Failed to setup webhook',
      details: error.message
    })
  }
})

// Cleanup webhook endpoint
app.delete('/api/webhooks/cleanup', async (req, res) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { connectionId, sourceId, destinationId } = req.body
    
    if (!connectionId || !sourceId || !destinationId) {
      return res.status(400).json({ error: 'Missing required IDs for cleanup' })
    }

    // Delete in reverse order: connection, source, destination
    await makeHookdeckRequest(`/connections/${connectionId}`, 'DELETE')
    await makeHookdeckRequest(`/sources/${sourceId}`, 'DELETE')
    await makeHookdeckRequest(`/destinations/${destinationId}`, 'DELETE')

    return res.status(200).json({
      success: true,
      message: 'Webhook cleaned up successfully'
    })

  } catch (error) {
    console.error('Error cleaning up webhook:', error)
    return res.status(500).json({ 
      error: 'Failed to cleanup webhook',
      details: error.message
    })
  }
})

// Webhook endpoint for registrations
app.post('/webhooks/registrations/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const payload = req.body

    // Validate required fields
    const validationErrors = validateRegistrationPayload(payload)
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      })
    }

    // Map payload to registration fields
    const registrationData = mapRegistrationPayload(payload, userId)

    // Insert registration into database
    const result = await sql`
      INSERT INTO registrations (
        id, form_id, name, email, contact, status, user_id, camp_id,
        onboarding_status, snack_bar_balance, total_amount_paid,
        id_number, sns_number, date_of_birth, dietary_restrictions,
        guardian_name, guardian_email, guardian_phone, created_at, updated_at
      ) VALUES (
        COALESCE(${registrationData.id}::uuid, gen_random_uuid()),
        ${registrationData.form_id},
        ${registrationData.name},
        ${registrationData.email},
        ${registrationData.contact},
        ${registrationData.status}::registration_status,
        ${registrationData.user_id}::uuid,
        ${registrationData.camp_id}::uuid,
        ${registrationData.onboarding_status}::onboarding_status_type,
        ${registrationData.snack_bar_balance},
        ${registrationData.total_amount_paid},
        ${registrationData.id_number},
        ${registrationData.sns_number},
        ${registrationData.date_of_birth}::date,
        ${registrationData.dietary_restrictions},
        ${registrationData.guardian_name},
        ${registrationData.guardian_email},
        ${registrationData.guardian_phone},
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
      )
      RETURNING *
    `

    const registration = result[0]

    return res.status(201).json({
      success: true,
      message: 'Registration created successfully',
      registration: registration
    })

  } catch (error) {
    console.error('Error processing registration webhook:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
})

// Webhook endpoint for payments
app.post('/webhooks/payments/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const payload = req.body

    // Validate required fields for payment
    if (!payload.registration_id && !payload.email) {
      return res.status(400).json({ 
        error: 'Either registration_id or email is required to identify the registration' 
      })
    }

    if (!payload.amount) {
      return res.status(400).json({ 
        error: 'Payment amount is required' 
      })
    }

    // Find the registration to update
    let registration
    if (payload.registration_id) {
      const result = await sql`
        SELECT * FROM registrations 
        WHERE id = ${payload.registration_id}::uuid AND user_id = ${userId}::uuid
      `
      registration = result[0]
    } else {
      const result = await sql`
        SELECT * FROM registrations 
        WHERE email = ${payload.email} AND user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT 1
      `
      registration = result[0]
    }

    if (!registration) {
      return res.status(404).json({ 
        error: 'Registration not found' 
      })
    }

    // Update payment information
    const newTotalPaid = (parseFloat(registration.total_amount_paid) || 0) + parseFloat(payload.amount)
    const newStatus = payload.status || (newTotalPaid > 0 ? 'paid' : 'unpaid')

    const updateResult = await sql`
      UPDATE registrations 
      SET 
        total_amount_paid = ${newTotalPaid},
        status = ${newStatus}::registration_status,
        updated_at = timezone('utc'::text, now())
      WHERE id = ${registration.id}::uuid
      RETURNING *
    `

    const updatedRegistration = updateResult[0]

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      registration: updatedRegistration,
      payment: {
        amount: parseFloat(payload.amount),
        total_paid: newTotalPaid,
        status: newStatus
      }
    })

  } catch (error) {
    console.error('Error processing payment webhook:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
})

// Export the Express app
export default app