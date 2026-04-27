import express, { Request, Response, RequestHandler, Application } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Stripe from 'stripe'

// Load environment variables
dotenv.config()

// Custom type for our route handlers
type AsyncRequestHandler = (req: Request, res: Response) => Promise<Response>

const app: Application = express()

// Configure express JSON parser - BEFORE CORS
app.use(express.json({ 
  limit: '10mb'
}))
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}))

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://campmanagement-pwsm6m1g4-souzaallanxzs-projects.vercel.app', 'https://campmanagement.vercel.app', 'https://www.campy.pt', ''],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}))

// Health check endpoint for Render
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})





// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY)

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
})

// Encryption functions for sensitive data
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32)
  const textParts = encryptedText.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedData = textParts.join(':')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Sign in route
app.post('/api/auth/sign-in', (async (req: Request, res: Response) => {
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
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
}) as any)

// Sign up route
app.post('/api/auth/sign-up', (async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUserResult = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `;

    if (existingUserResult.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await sql`
      INSERT INTO public.users (id, email, first_name, password_hash, role)
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword}, 'admin')
      RETURNING id, email, first_name, team_id
    `;

    const user = result[0];

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(200).json({
      user,
      session: {
        user,
        token: user.id // Using user ID as token for now
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : error });
  }
}) as any)

// Forgot password route
app.post('/api/auth/forgot-password', (async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    // Check if user exists
    const userResult = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `

    if (userResult.length === 0) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({ success: true })
    }

    const user = userResult[0]

    // Generate reset token (using a simple UUID for now)
    const resetToken = crypto.randomUUID();

    // Store reset token in database
    await sql`
      UPDATE public.users 
      SET password_reset_token = ${resetToken}, 
          password_reset_expires = NOW() + INTERVAL '1 hour'
      WHERE id = ${user.id}
    `

    // Generate reset link
    const resetLink = `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Check if Resend API key is configured
    if (!process.env.VITE_RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' })
    }

    // Send email
    const result = await resend.emails.send({
      from: 'Campy <noreply@campy.pt>',
      to: email,
      subject: 'Recuperação de Senha - Campy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Redefinir Senha
            </a>
          </p>
          <p>Se você não solicitou esta alteração, pode ignorar este email com segurança.</p>
          <p>Este link expirará em 1 hora.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    })

    if (result.error) {
      return res.status(500).json({ error: 'Failed to send password reset email', details: result.error })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}) as any)

// Reset password route
app.post('/api/auth/reset-password', (async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body

    // Find user with valid reset token
    const userResult = await sql`
      SELECT id 
      FROM public.users 
      WHERE password_reset_token = ${token} 
      AND password_reset_expires > NOW()
    `

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const user = userResult[0]

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update password and clear reset token
    await sql`
      UPDATE public.users 
      SET password_hash = ${hashedPassword}, 
          password_reset_token = NULL, 
          password_reset_expires = NULL
      WHERE id = ${user.id}
    `

    return res.status(200).json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Get current user route
app.get('/api/auth/me', (async (req: Request, res: Response) => {
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
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
}) as any)

// Get current user profile route
app.get('/api/auth/profile', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Find user by token (which is the user ID)
    const userResult = await sql`
      SELECT id, email, first_name, last_name, team_id, role, language, created_at, updated_at
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
      user: {
        id: user.id,
        email: user.email,
        name: fullName,
        team_id: user.team_id,
        role: user.role,
        language: user.language
      }
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
}) as any)

// Update current user profile route
app.put('/api/auth/profile', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const { firstName, lastName, language, theme } = req.body

    // Find user by token (which is the user ID)
    const userResult = await sql`
      SELECT id, first_name, last_name, email, team_id, role, language
      FROM public.users
      WHERE id = ${token}::uuid
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Update user profile
    const updateResult = await sql`
      UPDATE public.users
      SET first_name = ${firstName}, last_name = ${lastName}, language = ${language}, updated_at = NOW()
      WHERE id = ${token}::uuid
      RETURNING id, email, first_name, last_name, team_id, role, language
    `

    const updatedUser = updateResult[0]

    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user profile' })
    }

    // Combine first_name and last_name to create the full name
    const fullName = `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim()

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: fullName,
        team_id: updatedUser.team_id,
        role: updatedUser.role,
        language: updatedUser.language
      }
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL
    })
  }
}) as any)

// Existing email route
app.post('/api/send-email', (async (req: Request, res: Response) => {
  try {
    if (!process.env.VITE_RESEND_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: { 
          name: 'configuration_error', 
          message: 'Resend API key not configured' 
        } 
      })
    }
    
    const { from, to, subject, html, text } = req.body
    
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text
    })
    
    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          name: 'resend_error', 
          message: result.error.message 
        } 
      })
    }
    
    return res.json({ 
      success: true, 
      data: result.data
    })
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: { 
        name: 'server_error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      } 
    })
  }
}) as any)

// Setup password route
app.post('/api/auth/setup-password', (async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }
    // Verifica se o usuário existe e está como 'invited'
    const userResult = await sql`
      SELECT id, status FROM public.users WHERE id = ${userId}::uuid
    `;
    const user = userResult[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    if (user.status !== 'invited') {
      return res.status(400).json({ error: 'Este usuário já definiu sua senha.' });
    }
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Atualiza a senha e status
    await sql`
      UPDATE public.users
      SET password_hash = ${hashedPassword}, status = 'active', updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erro ao definir senha.' });
  }
}) as any)

// === GET CURRENT USER'S TEAM ===
app.get('/api/teams/current', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    // Buscar o usuário pelo token (id)
    const userResult = await sql`
      SELECT team_id FROM public.users WHERE id = ${token}::uuid
    `;
    const user = userResult[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.team_id) {
      return res.json(null); // Usuário não tem equipe
    }
    // Buscar os dados do time
    const teamResult = await sql`
      SELECT * FROM public.teams WHERE id = ${user.team_id}::uuid
    `;
    const team = teamResult[0];
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    return res.json(team);
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}) as any)

// === CREATE NEW TEAM ===
app.post('/api/teams', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Buscar o usuário pelo token (id)
    const userResult = await sql`
      SELECT id, team_id FROM public.users WHERE id = ${token}::uuid
    `;
    
    const user = userResult[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verificar se o usuário já tem uma equipe
    if (user.team_id) {
      return res.status(400).json({ error: 'User already belongs to a team' });
    }

    // Criar a nova equipe
    const teamResult = await sql`
      INSERT INTO public.teams (id, name, created_at, updated_at)
      VALUES (gen_random_uuid(), ${name}, NOW(), NOW())
      RETURNING *
    `;

    const team = teamResult[0];
    if (!team) {
      return res.status(500).json({ error: 'Failed to create team' });
    }

    // Associar o usuário à equipe
    await sql`
      UPDATE public.users 
      SET team_id = ${team.id}::uuid, updated_at = NOW()
      WHERE id = ${user.id}::uuid
    `;

    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}) as any)

// === UPDATE TEAM ===
app.put('/api/teams/:id', (async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Get user's team_id from their profile
    const userResult = await sql`
      SELECT team_id FROM public.users WHERE id = ${token}::uuid
    `

    const user = userResult[0]
    if (!user || !user.team_id) {
      return res.status(401).json({ error: 'User not found or no team associated' })
    }

    const teamId = user.team_id

    // Ensure user can only update their own team
    if (id !== teamId) {
      return res.status(403).json({ error: 'You can only update your own team' })
    }

    const { name, logo_url, tier } = req.body

    // Validate tier value if provided
    if (tier !== undefined && !['free', 'premium'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier value. Must be "free" or "premium"' })
    }

    // For now, we'll focus on tier updates
    if (tier === undefined) {
      return res.status(400).json({ error: 'Tier field is required' })
    }

    // Update team tier
    const result = await sql`
      UPDATE teams 
      SET tier = ${tier}, updated_at = NOW()
      WHERE id = ${teamId}::uuid
      RETURNING *
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    return res.status(200).json(result[0])
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// ===== DASHBOARD ENDPOINTS =====

// Helper para obter o teamId do header (produção)
function getTeamId(req: Request) {
  // Check for x-team-id header
  const teamId = req.headers['x-team-id']
  if (!teamId || typeof teamId !== 'string') {
    return null
  }
  return teamId
}

app.get('/api/dashboard/monthly-payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Pagamentos do ano atual
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM payment_date) = ${currentYear}
      AND c.team_id = ${teamId}
    `;
    // Pagamentos do ano anterior
    const previous = await sql`
      SELECT COALESCE(SUM(amount), 0) as previous_year_total
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM payment_date) = ${currentYear - 1}
      AND c.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_amount) || 0;
    const previousTotal = Number(previous[0]?.previous_year_total) || 0;
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100;
    res.json({ total, previousTotal, percentageChange });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
}) as any)

app.get('/api/dashboard/monthly-registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Inscrições do ano atual
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND c.team_id = ${teamId}
    `;
    // Inscrições do ano anterior
    const previous = await sql`
      SELECT COUNT(*) as previous_year_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM r.created_at) = ${currentYear - 1}
      AND c.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_count) || 0;
    const previousTotal = Number(previous[0]?.previous_year_count) || 0;
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100;
    res.json({ total, previousTotal, percentageChange });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
}) as any)

app.get('/api/dashboard/monthly-snackbar', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Carregamentos do ano atual
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND camp.team_id = ${teamId}
    `;
    // Carregamentos do ano anterior
    const previous = await sql`
      SELECT COALESCE(SUM(amount), 0) as previous_year_total
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM sb.created_at) = ${currentYear - 1}
      AND camp.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_amount) || 0;
    const previousTotal = Number(previous[0]?.previous_year_total) || 0;
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100;
    res.json({ total, previousTotal, percentageChange });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar carregamentos.' });
  }
}) as any)

app.get('/api/dashboard/yearly-campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Campistas do ano atual
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM c.created_at) = ${currentYear}
      AND camp.team_id = ${teamId}
    `;
    // Campistas do ano anterior
    const previous = await sql`
      SELECT COUNT(*) as previous_year_count
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM c.created_at) = ${currentYear - 1}
      AND camp.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_count) || 0;
    const previousTotal = Number(previous[0]?.previous_year_count) || 0;
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100;
    res.json({ total, previousTotal, percentageChange });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar campistas.' });
  }
}) as any)

app.get('/api/dashboard/camp-payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Buscar dados de pagamentos por acampamento (tabela payments)
    const camps = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM p.payment_date) = ${currentYear} THEN p.amount ELSE 0 END), 0) as total_payments,
        COUNT(DISTINCT r.id) as total_registrations
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id AND p.payment_status = 'confirmed'
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.start_date ASC
    `;
    
    const result = camps.map(camp => ({
      campId: camp.camp_id,
      campName: camp.camp_name,
      totalPayments: Number(camp.total_payments) || 0,
      totalRegistrations: Number(camp.total_registrations) || 0
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching camp payments:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos por acampamento.' });
  }
}) as any)

// Debug endpoint to check snackbar_balance data
app.get('/api/debug/snackbar-data', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Check all snackbar_balance records for this team
    const allSnackbarData = await sql`
      SELECT 
        sb.*,
        r.name as registration_name,
        c.name as camp_name,
        c.team_id
      FROM snackbar_balance sb
      LEFT JOIN registrations r ON sb.registration_id = r.id
      LEFT JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}
      ORDER BY sb.created_at DESC
    `;
    
    // Check total snackbar amounts by camp
    const campTotals = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COUNT(sb.id) as snackbar_count,
        COALESCE(SUM(sb.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN sb.payment_status = 'confirmed' THEN sb.amount ELSE 0 END), 0) as confirmed_amount
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN snackbar_balance sb ON r.id = sb.registration_id
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.start_date ASC
    `;
    
    res.json({
      allSnackbarData,
      campTotals,
      debug: {
        teamId,
        totalRecords: allSnackbarData.length,
        campsWithSnackbar: campTotals.filter(c => c.snackbar_count > 0).length
      }
    });
  } catch (error) {
    console.error('Error in debug snackbar data:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de debug.' });
  }
}) as any)

// Get snackbar data per camp for analytics
app.get('/api/dashboard/camp-snackbar', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Buscar dados de snackbar por acampamento incluindo valores liquidados
    // Primeiro, buscar total de snackbar por acampamento
    const snackbarData = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(sb.amount::numeric), 0) as total_snackbar,
        COUNT(sb.id) as snackbar_count
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN snackbar_balance sb ON r.id = sb.registration_id AND sb.payment_status = 'confirmed'
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
    `;
    
    // Depois, buscar total de transações liquidadas por acampamento (campers + staff)
    const liquidatedData = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(sbt.amount::numeric), 0) as total_liquidated,
        COUNT(sbt.id) as liquidated_count
      FROM camps c
      LEFT JOIN (
        -- Transações liquidadas de campers
        SELECT 
          r.camp_id,
          sbt.amount,
          sbt.id
        FROM snack_bar_transactions sbt
        JOIN campers ca ON sbt.camper_id = ca.id
        JOIN registrations r ON ca.registration_id = r.id
        WHERE sbt.is_liquidated = true
        
        UNION ALL
        
        -- Transações liquidadas de staff
        SELECT 
          s.camp_id,
          sbt.amount,
          sbt.id
        FROM snack_bar_transactions sbt
        JOIN staff s ON sbt.staff_id = s.id
        WHERE sbt.is_liquidated = true
      ) sbt ON c.id = sbt.camp_id
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
    `;
    
    // Combinar os dados
    const camps = snackbarData.map(snackbar => {
      const liquidated = liquidatedData.find(l => l.camp_id === snackbar.camp_id);
      return {
        ...snackbar,
        total_liquidated: liquidated ? liquidated.total_liquidated : 0,
        liquidated_count: liquidated ? liquidated.liquidated_count : 0
      };
    });
    
    const result = camps.map(camp => ({
      campId: camp.camp_id,
      campName: camp.camp_name,
      totalSnackbar: Number(camp.total_snackbar) || 0,
      totalLiquidated: Number(camp.total_liquidated) || 0
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching camp snackbar data:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de snackbar por acampamento.' });
  }
}) as any)

// Debug endpoint to check liquidated transactions
app.get('/api/debug/liquidated-transactions', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Check all liquidated transactions (campers + staff)
    const liquidatedTransactions = await sql`
      SELECT 
        sbt.*,
        ca.name as camper_name,
        s.name as staff_name,
        c.name as camp_name,
        CASE 
          WHEN sbt.camper_id IS NOT NULL THEN 'camper'
          WHEN sbt.staff_id IS NOT NULL THEN 'staff'
          ELSE 'unknown'
        END as transaction_type
      FROM snack_bar_transactions sbt
      LEFT JOIN campers ca ON sbt.camper_id = ca.id
      LEFT JOIN registrations r ON ca.registration_id = r.id
      LEFT JOIN staff s ON sbt.staff_id = s.id
      LEFT JOIN camps c ON COALESCE(r.camp_id, s.camp_id) = c.id
      WHERE sbt.is_liquidated = true 
        AND c.team_id = ${teamId}
      ORDER BY sbt.created_at DESC
    `;
    
    // Check total liquidated by camp (campers + staff)
    const liquidatedByCamp = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(sbt.amount::numeric), 0) as total_liquidated,
        COUNT(sbt.id) as liquidated_count
      FROM camps c
      LEFT JOIN (
        -- Transações liquidadas de campers
        SELECT 
          r.camp_id,
          sbt.amount,
          sbt.id
        FROM snack_bar_transactions sbt
        JOIN campers ca ON sbt.camper_id = ca.id
        JOIN registrations r ON ca.registration_id = r.id
        WHERE sbt.is_liquidated = true
        
        UNION ALL
        
        -- Transações liquidadas de staff
        SELECT 
          s.camp_id,
          sbt.amount,
          sbt.id
        FROM snack_bar_transactions sbt
        JOIN staff s ON sbt.staff_id = s.id
        WHERE sbt.is_liquidated = true
      ) sbt ON c.id = sbt.camp_id
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.start_date ASC
    `;
    
    res.json({
      liquidatedTransactions,
      liquidatedByCamp
    });
  } catch (error) {
    console.error('Error fetching liquidated transactions:', error);
    res.status(500).json({ error: 'Error fetching liquidated transactions' });
  }
}) as any)

// Debug endpoint to compare with direct database query
app.get('/api/debug/snackbar-simple', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Simple query similar to what user ran directly - only confirmed payments
    const result = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(CASE WHEN sb.payment_status = 'confirmed' THEN sb.amount::numeric ELSE 0 END), 0) as total_snackbar
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN snackbar_balance sb ON r.id = sb.registration_id
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.name
    `;
    
    res.json(result);
  } catch (error) {
    console.error('Error in simple snackbar debug:', error);
    res.status(500).json({ error: 'Error fetching simple snackbar data' });
  }
}) as any)

// Debug endpoint to check raw snackbar data
app.get('/api/debug/snackbar-raw', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const rawData = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        r.id as registration_id,
        r.name as registration_name,
        sb.id as snackbar_id,
        sb.amount,
        sb.payment_status,
        sb.created_at
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN snackbar_balance sb ON r.id = sb.registration_id
      WHERE c.team_id = ${teamId}
      ORDER BY c.name, r.name, sb.created_at
    `;
    
    res.json(rawData);
  } catch (error) {
    console.error('Error fetching raw snackbar data:', error);
    res.status(500).json({ error: 'Error fetching raw snackbar data' });
  }
}) as any)

// Debug endpoint to check aggregated snackbar data
app.get('/api/debug/snackbar-aggregated', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const camps = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(sb.amount::numeric), 0) as total_snackbar,
        COUNT(sb.id) as snackbar_count,
        STRING_AGG(DISTINCT sb.payment_status, ', ') as payment_statuses,
        STRING_AGG(DISTINCT sb.amount::text, ', ') as amounts
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN snackbar_balance sb ON r.id = sb.registration_id AND sb.payment_status = 'confirmed'
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.start_date ASC
    `;
    
    
    res.json(camps);
  } catch (error) {
    console.error('Error fetching aggregated snackbar data:', error);
    res.status(500).json({ error: 'Error fetching aggregated snackbar data' });
  }
}) as any)

// Temporary endpoint to list teams for debugging
app.get('/api/debug/teams', (async (req: Request, res: Response) => {
  try {
    const teams = await sql`
      SELECT id, name, created_at
      FROM teams
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
}) as any)

app.get('/api/dashboard/recent-registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const limit = Number(req.query.limit) || 5;
    const regs = await sql`
      SELECT 
        r.id, 
        r.name, 
        r.email, 
        r.created_at,
        c.name as camp_name,
        COALESCE(SUM(CASE WHEN p.payment_status = 'confirmed' THEN p.amount ELSE 0 END), 0) as total_paid
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      LEFT JOIN payments p ON r.id = p.registration_id AND p.payment_status != 'expired'
      WHERE c.team_id = ${teamId}
      GROUP BY r.id, r.name, r.email, r.created_at, c.name
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `;
    const result = regs.map(reg => ({
      id: reg.id,
      name: reg.name,
      email: reg.email,
      totalPaid: Number(reg.total_paid) || 0,
      createdAt: new Date(reg.created_at).toISOString(),
      campName: reg.camp_name
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar inscrições recentes.' });
  }
}) as any)

app.get('/api/registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  
  try {
    // Consulta para buscar registros com seus respectivos acampamentos
    const registrationsQuery = await sql`
      SELECT 
        r.id,
        r.form_id,
        r.name,
        r.email,
        r.contact,
        r.status,
        r.created_at,
        r.updated_at,
        r.user_id,
        r.camp_id,
        r.onboarding_status,
        r.snack_bar_balance,
        r.id_number,
        r.sns_number,
        r.date_of_birth,
        r.dietary_restrictions,
        r.guardian_name,
        r.guardian_email,
        r.guardian_phone,
        c.name as camp_name,
        c.start_date as camp_start_date,
        c.end_date as camp_end_date,
        c.price as camp_price,
        COALESCE(SUM(CASE WHEN p.payment_status = 'confirmed' THEN p.amount ELSE 0 END), 0) as total_paid
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      LEFT JOIN payments p ON r.id = p.registration_id AND p.payment_status != 'expired'
      WHERE c.team_id = ${teamId}
      GROUP BY r.id, r.form_id, r.name, r.email, r.contact, r.status, r.created_at, r.updated_at, r.user_id, r.camp_id, r.onboarding_status, r.snack_bar_balance, r.id_number, r.sns_number, r.date_of_birth, r.dietary_restrictions, r.guardian_name, r.guardian_email, r.guardian_phone, c.name, c.start_date, c.end_date, c.price
      ORDER BY r.created_at DESC
    `;
    
    // Processar os resultados
    const registrations = registrationsQuery.map(registration => {
      // Converter valores para números
      const totalPaid = parseFloat(registration.total_paid) || 0;
      const campPrice = parseFloat(registration.camp_price) || 0;
      
      // Determinar status baseado no total pago vs preço do acampamento
      let status = 'unpaid';
      if (totalPaid >= campPrice || (campPrice > 0 && (campPrice - totalPaid) < 1)) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }
      
      // Retornar registro com valores processados
      return {
        ...registration,
        total_paid: totalPaid,
        camp_price: campPrice,
        status: status
      };
    });
    
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
}) as any);

app.get('/api/camps', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const camps = await sql`
      SELECT * FROM camps WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(camps);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar acampamentos.' });
  }
}) as any);

// Create a new camp
app.post('/api/camps', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { name, start_date, end_date, price } = req.body;
    if (!name || !start_date || !end_date || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO camps (name, start_date, end_date, price, team_id, created_at, updated_at)
      VALUES (${name}, ${start_date}, ${end_date}, ${price}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar acampamento.' });
  }
}) as any);

// Update a camp
app.put('/api/camps/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { name, start_date, end_date, price } = req.body;
    
    // Validate that the camp exists and belongs to the team
    const existingCamp = await sql`
      SELECT id FROM camps 
      WHERE id = ${id} AND team_id = ${teamId}
      LIMIT 1
    `;
    
    if (existingCamp.length === 0) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to update it' });
    }
    
    // Update the camp with the provided fields
    const result = await sql`
      UPDATE camps 
      SET 
        name = COALESCE(${name}, name),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        price = COALESCE(${price}, price),
        updated_at = NOW()
      WHERE id = ${id} AND team_id = ${teamId}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to update it' });
    }
    
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar acampamento.' });
  }
}) as any);

// Delete a camp
app.delete('/api/camps/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Check if there are any registrations for this camp
    const regs = await sql`SELECT id FROM registrations WHERE camp_id = ${id} LIMIT 1`;
    if (regs.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.' });
    }
    const result = await sql`DELETE FROM camps WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar acampamento.' });
  }
}) as any);

// Get current camp (active camp where current date is between start_date and end_date)
app.get('/api/camps/current', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    const currentCamp = await sql`
      SELECT * FROM camps 
      WHERE team_id = ${teamId} 
      AND ${currentDate}::date BETWEEN start_date AND end_date
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    if (currentCamp.length === 0) {
      return res.status(404).json({ error: 'No active camps found for this team' });
    }
    
    res.json(currentCamp[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar acampamento atual.' });
  }
}) as any);

// List all campers for the current team (optimized with single query)
app.get('/api/campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camp_id } = req.query;
    
    // Single optimized query that calculates all balances in one go
    let campers;
    if (camp_id) {
      campers = await sql`
        SELECT 
          ca.*,
          c.name as camp_name,
          r.form_id,
          COALESCE(sb.total_loaded, 0) as total_loaded,
          COALESCE(sbt_spent.total_spent, 0) as total_spent,
          COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
          (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
          CASE 
            WHEN sb.total_loaded IS NULL THEN 'confirmed'
            WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        LEFT JOIN (
          SELECT 
            registration_id,
            SUM(amount) as total_loaded,
            CASE 
              WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
              ELSE 'not confirmed'
            END as payment_status
          FROM snackbar_balance
          WHERE payment_status = 'confirmed'
          GROUP BY registration_id
        ) sb ON r.id = sb.registration_id
        LEFT JOIN (
          SELECT 
            camper_id,
            SUM(amount) as total_spent
          FROM snack_bar_transactions
          WHERE is_liquidated = false
          GROUP BY camper_id
        ) sbt_spent ON ca.id = sbt_spent.camper_id
        LEFT JOIN (
          SELECT 
            camper_id,
            SUM(amount) as total_liquidated
          FROM snack_bar_transactions
          WHERE is_liquidated = true
          GROUP BY camper_id
        ) sbt_liquidated ON ca.id = sbt_liquidated.camper_id
        WHERE c.team_id = ${teamId} AND c.id = ${camp_id}
        ORDER BY ca.created_at DESC
      `;
    } else {
      campers = await sql`
        SELECT 
          ca.*,
          c.name as camp_name,
          r.form_id,
          COALESCE(sb.total_loaded, 0) as total_loaded,
          COALESCE(sbt_spent.total_spent, 0) as total_spent,
          COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
          (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
          CASE 
            WHEN sb.total_loaded IS NULL THEN 'confirmed'
            WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        LEFT JOIN (
          SELECT 
            registration_id,
            SUM(amount) as total_loaded,
            CASE 
              WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
              ELSE 'not confirmed'
            END as payment_status
          FROM snackbar_balance
          WHERE payment_status = 'confirmed'
          GROUP BY registration_id
        ) sb ON r.id = sb.registration_id
        LEFT JOIN (
          SELECT 
            camper_id,
            SUM(amount) as total_spent
          FROM snack_bar_transactions
          WHERE is_liquidated = false
          GROUP BY camper_id
        ) sbt_spent ON ca.id = sbt_spent.camper_id
        LEFT JOIN (
          SELECT 
            camper_id,
            SUM(amount) as total_liquidated
          FROM snack_bar_transactions
          WHERE is_liquidated = true
          GROUP BY camper_id
        ) sbt_liquidated ON ca.id = sbt_liquidated.camper_id
        WHERE c.team_id = ${teamId}
        ORDER BY ca.created_at DESC
      `;
    }

    // Process results to match expected format
    const processedCampers = campers.map((camper: any) => ({
      ...camper,
      camp: { name: camper.camp_name },
      snack_bar_balance: Number(camper.snack_bar_balance) || 0,
      totalLoaded: Number(camper.total_loaded) || 0,
      totalSpent: Number(camper.total_spent) || 0,
      totalLiquidated: Number(camper.total_liquidated) || 0,
      payment_status: camper.payment_status || 'confirmed',
      form_id: camper.form_id || null
    }));

    res.json(processedCampers);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campistas.', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}) as any);

// Get a single camper by ID with balance
app.get('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const camper = await sql`
      SELECT 
        ca.*,
        c.name as camp_name,
        r.form_id,
        COALESCE(sb.total_loaded, 0) as total_loaded,
        COALESCE(sbt_spent.total_spent, 0) as total_spent,
        COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
        (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
        CASE 
          WHEN sb.total_loaded IS NULL THEN 'confirmed'
          WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      LEFT JOIN (
        SELECT 
          registration_id,
          SUM(amount) as total_loaded,
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE payment_status = 'confirmed'
        GROUP BY registration_id
      ) sb ON r.id = sb.registration_id
      LEFT JOIN (
        SELECT 
          camper_id,
          SUM(amount) as total_spent
        FROM snack_bar_transactions
        WHERE is_liquidated = false
        GROUP BY camper_id
      ) sbt_spent ON ca.id = sbt_spent.camper_id
      LEFT JOIN (
        SELECT 
          camper_id,
          SUM(amount) as total_liquidated
        FROM snack_bar_transactions
        WHERE is_liquidated = true
        GROUP BY camper_id
      ) sbt_liquidated ON ca.id = sbt_liquidated.camper_id
      WHERE ca.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    if (!camper[0]) {
      return res.status(404).json({ error: 'Camper not found' });
    }
    
    // Process result to match expected format
    const processedCamper = {
      ...camper[0],
      camp: { name: camper[0].camp_name },
      snack_bar_balance: Number(camper[0].snack_bar_balance) || 0,
      totalLoaded: Number(camper[0].total_loaded) || 0,
      totalSpent: Number(camper[0].total_spent) || 0,
      totalLiquidated: Number(camper[0].total_liquidated) || 0,
      payment_status: camper[0].payment_status || 'confirmed',
      form_id: camper[0].form_id || null
    };
    
    res.json(processedCamper);
  } catch (error) {
    console.error('Error fetching camper:', error);
    res.status(500).json({ error: 'Erro ao buscar campista.' });
  }
}) as any);

// Create a new camper
app.post('/api/campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { name, email, contact, registration_id, form_id, camp, additional_notes } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // If registration_id is provided, check if it belongs to the team
    if (registration_id) {
      const reg = await sql`
        SELECT r.id FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
      `;
      if (!reg[0]) {
        return res.status(400).json({ error: 'Registration does not belong to your team' });
      }
    }
    
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO campers (name, email, contact, registration_id, form_id, camp, additional_notes, created_at, updated_at)
      VALUES (${name}, ${email}, ${contact || null}, ${registration_id}, ${form_id}, ${camp}, ${additional_notes}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar campista.' });
  }
}) as any);

// Update a camper
app.put('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      contact, 
      form_id, 
      camp, 
      additional_notes,
      id_number,
      sns_number,
      date_of_birth,
      dietary_restrictions,
      guardian_name,
      guardian_email,
      guardian_phone 
    } = req.body;
    
    const now = new Date().toISOString();
    const fields = [];
    if (name !== undefined) fields.push(sql`name = ${name}`);
    if (email !== undefined) fields.push(sql`email = ${email}`);
    if (contact !== undefined) fields.push(sql`contact = ${contact}`);
    if (form_id !== undefined) fields.push(sql`form_id = ${form_id}`);
    if (camp !== undefined) fields.push(sql`camp = ${camp}`);
    if (additional_notes !== undefined) fields.push(sql`additional_notes = ${additional_notes}`);
    if (id_number !== undefined) fields.push(sql`id_number = ${id_number}`);
    if (sns_number !== undefined) fields.push(sql`sns_number = ${sns_number}`);
    if (date_of_birth !== undefined) fields.push(sql`date_of_birth = ${date_of_birth}`);
    if (dietary_restrictions !== undefined) fields.push(sql`dietary_restrictions = ${dietary_restrictions}`);
    if (guardian_name !== undefined) fields.push(sql`guardian_name = ${guardian_name}`);
    if (guardian_email !== undefined) fields.push(sql`guardian_email = ${guardian_email}`);
    if (guardian_phone !== undefined) fields.push(sql`guardian_phone = ${guardian_phone}`);
    fields.push(sql`updated_at = ${now}`);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const setClause = sql.join(fields, sql`, `);
    
    const result = await sql.unsafe(
      `UPDATE campers SET ${setClause.sql} WHERE id = $1 AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = $2) RETURNING *`,
      [id, teamId, ...setClause.values]
    );
    
    if (!result[0]) {
      return res.status(404).json({ error: 'Camper not found or you do not have permission to update it' });
    }
    
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar campista.' });
  }
}) as any);

// Delete a camper
app.delete('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`
      DELETE FROM campers WHERE id = ${id} AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camper not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar campista.' });
  }
}) as any);

// List all users for the current team
app.get('/api/users', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const users = await sql`
      SELECT * FROM users WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}) as any);

// Create a new user for the team
app.post('/api/users', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { firstName, lastName, email, role } = req.body;
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const now = new Date().toISOString();
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, role, team_id, created_at, updated_at, status, invite_token, invite_expires_at)
      VALUES (${firstName}, ${lastName}, ${email}, ${role}, ${teamId}, ${now}, ${now}, 'invited', ${inviteToken}, ${inviteExpiresAt})
      RETURNING *
    `;
    // Enviar email de convite
    const setupLink = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?userId=${result[0].id}&token=${inviteToken}&email=${encodeURIComponent(email)}`;
    await resend.emails.send({
      from: 'Campy <noreply@campy.pt>',
      to: email,
      subject: 'Convite para a plataforma Campy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bem-vindo à plataforma Campy!</h2>
          <p>Foi convidado para fazer parte da nossa plataforma.</p>
          <p>Clique no botão abaixo para definir sua palavra-passe e começar a usar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Definir Palavra-passe</a>
          </div>
          <p>Se você não solicitou este convite, ignore este email.</p>
          <p>Este link expira em 24 horas por motivos de segurança.</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">© 2025 Campy. Todos os direitos reservados.</p>
        </div>
      `
    });
    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}) as any);

// GET user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`SELECT * FROM users WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// PUT user by ID
app.put('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role } = req.body;
    
    // Check if user exists and belongs to team
    const userCheck = await sql`SELECT id, team_id FROM users WHERE id = ${id}::uuid`;
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck[0].team_id !== teamId) {
      return res.status(403).json({ error: 'User does not belong to your team' });
    }
    
    const now = new Date().toISOString();
    const updateFields = [];
    
    if (firstName !== undefined) {
      updateFields.push(sql`first_name = ${firstName}`);
    }
    if (lastName !== undefined) {
      updateFields.push(sql`last_name = ${lastName}`);
    }
    if (email !== undefined) {
      updateFields.push(sql`email = ${email}`);
    }
    if (role !== undefined) {
      updateFields.push(sql`role = ${role}`);
    }
    updateFields.push(sql`updated_at = ${now}`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const setClause = sql.join(updateFields, sql`, `);
    const result = await sql`
      UPDATE users 
      SET ${setClause} 
      WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid 
      RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// DELETE user by ID
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`DELETE FROM users WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid RETURNING *`;
    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

// Create a new registration for the current team
app.post('/api/registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const {
      camp_id, name, email, contact, status, onboarding_status, form_id,
      id_number, sns_number, date_of_birth, dietary_restrictions,
      guardian_name, guardian_email, guardian_phone, request_id
    } = req.body;

    if (!camp_id || !name || !email || !contact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if camp belongs to the team
    const camp = await sql`SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}`;
    if (!camp[0]) {
      return res.status(400).json({ error: 'Camp does not belong to your team' });
    }

    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO registrations (
        camp_id, name, email, contact, status, onboarding_status, form_id,
        id_number, sns_number, date_of_birth, dietary_restrictions,
        guardian_name, guardian_email, guardian_phone, request_id, created_at, updated_at
      )
      VALUES (
        ${camp_id}, ${name}, ${email}, ${contact}, ${status || 'unpaid'}, ${onboarding_status || 'Pendente'}, ${form_id},
        ${id_number}, ${sns_number}, ${date_of_birth}, ${dietary_restrictions},
        ${guardian_name}, ${guardian_email}, ${guardian_phone}, ${request_id || null}, ${now}, ${now}
      )
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar inscrição.' });
  }
}) as any);

// Get a single registration by ID
app.get('/api/registrations/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    
    // Get registration with camp details
    const registrationResult = await sql`
      SELECT 
        r.id,
        r.form_id,
        r.name,
        r.email,
        r.contact,
        r.status,
        r.created_at,
        r.updated_at,
        r.user_id,
        r.camp_id,
        r.onboarding_status,
        r.snack_bar_balance,
        r.id_number,
        r.sns_number,
        r.date_of_birth,
        r.dietary_restrictions,
        r.guardian_name,
        r.guardian_email,
        r.guardian_phone,
        r.request_id,
        c.name as camp_name,
        c.start_date as camp_start_date,
        c.end_date as camp_end_date,
        c.price as camp_price
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (registrationResult.length === 0) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to access it' });
    }
    
    const registration = registrationResult[0];
    
    // Get total paid amount separately
    const totalPaidResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments 
      WHERE registration_id = ${id}::uuid AND payment_status = 'confirmed' AND payment_status != 'expired'
    `;
    
    const totalPaid = parseFloat(totalPaidResult[0]?.total_paid || '0');
    const campPrice = parseFloat(registration.camp_price || '0');
    
    // Determine status based on total paid vs camp price
    let status = 'unpaid';
    if (totalPaid >= campPrice || (campPrice > 0 && (campPrice - totalPaid) < 1)) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }
    
    res.json({
      ...registration,
      total_paid: totalPaid,
      camp_price: campPrice,
      status: status
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar inscrição.' });
  }
}) as any);

// Update a registration
app.put('/api/registrations/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const {
      camp_id, name, email, contact, status, onboarding_status, form_id,
      id_number, sns_number, date_of_birth, dietary_restrictions,
      guardian_name, guardian_email, guardian_phone, request_id
    } = req.body;
    const now = new Date().toISOString();
    const fields = [];
    if (camp_id !== undefined) fields.push(sql`camp_id = ${camp_id}`);
    if (name !== undefined) fields.push(sql`name = ${name}`);
    if (email !== undefined) fields.push(sql`email = ${email}`);
    if (contact !== undefined) fields.push(sql`contact = ${contact}`);
    if (status !== undefined) fields.push(sql`status = ${status}`);
    if (onboarding_status !== undefined) fields.push(sql`onboarding_status = ${onboarding_status}`);
    if (form_id !== undefined) fields.push(sql`form_id = ${form_id}`);
    if (id_number !== undefined) fields.push(sql`id_number = ${id_number}`);
    if (sns_number !== undefined) fields.push(sql`sns_number = ${sns_number}`);
    if (date_of_birth !== undefined) fields.push(sql`date_of_birth = ${date_of_birth}`);
    if (dietary_restrictions !== undefined) fields.push(sql`dietary_restrictions = ${dietary_restrictions}`);
    if (guardian_name !== undefined) fields.push(sql`guardian_name = ${guardian_name}`);
    if (guardian_email !== undefined) fields.push(sql`guardian_email = ${guardian_email}`);
    if (guardian_phone !== undefined) fields.push(sql`guardian_phone = ${guardian_phone}`);
    if (request_id !== undefined) fields.push(sql`request_id = ${request_id}`);
    fields.push(sql`updated_at = ${now}`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = sql.join(fields, sql`, `);
    // Only update if registration belongs to a camp of the team
    const result = await sql.unsafe(
      `UPDATE registrations SET ${setClause.sql} WHERE id = $1 AND camp_id IN (SELECT id FROM camps WHERE team_id = $2) RETURNING *`,
      [id, teamId, ...setClause.values]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar inscrição.' });
  }
}) as any);

// Delete a registration
app.delete('/api/registrations/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Only delete if registration belongs to a camp of the team
    const result = await sql`
      DELETE FROM registrations WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar inscrição.' });
  }
}) as any);

// Update registration onboarding status
app.patch('/api/registrations/:id/onboarding-status', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  
  
  
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const now = new Date().toISOString();
    
    // First, check if the registration exists and belongs to the team
    const registrationCheck = await sql`
      SELECT r.id, r.camp_id, c.team_id 
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id}::uuid
    `;
    
    
    
    if (registrationCheck.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // Compare team_id as strings
    const registrationTeamId = registrationCheck[0].team_id;
    
    
    if (registrationTeamId !== teamId) {
      return res.status(404).json({ error: 'Registration does not belong to your team' });
    }
    
    // Update the registration
    const result = await sql`
      UPDATE registrations 
      SET onboarding_status = ${status}, updated_at = ${now}
      WHERE id = ${id}::uuid
      RETURNING *
    `;
    
    
    
    if (!result[0]) {
      return res.status(404).json({ error: 'Failed to update registration' });
    }
    
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status de onboarding.' });
  }
}) as any);

// Helper to update registration status after payment changes
async function updateRegistrationStatus(registrationId: string) {
  // Get total paid amount - only confirmed payments (exclude pending and expired)
  const totalPaid = await sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE registration_id = ${registrationId} AND payment_status = 'confirmed' AND payment_status != 'expired'
  `;
  // Get the registration with its camp
  const registration = await sql`
    SELECT r.id, c.price as camp_price
    FROM registrations r
    JOIN camps c ON r.camp_id = c.id
    WHERE r.id = ${registrationId}
  `;
  if (!registration[0]) return;
  const campPrice = Number(registration[0].camp_price || 0);
  // Determine new status
  let newStatus = 'unpaid';
  if (totalPaid[0].total >= campPrice) {
    newStatus = 'paid';
  } else if (totalPaid[0].total > 0) {
    newStatus = 'partial';
  }
  // Update registration status and total_amount_paid
  await sql`
    UPDATE registrations SET status = ${newStatus}, total_amount_paid = ${totalPaid[0].total} WHERE id = ${registrationId}
  `;
}

// Get payments by registrationId
app.get('/api/payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  const { registrationId } = req.query;
  
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  
  if (!registrationId) {
    return res.status(400).json({ error: 'Missing registrationId' });
  }
  
  try {
    // First verify if the registration belongs to the team
    const registration = await sql`
      SELECT r.id 
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registrationId}::uuid
      AND c.team_id = ${teamId}::uuid
    `;
    
    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }
    
    const payments = await sql`
      SELECT 
        p.id,
        p.registration_id,
        p.payment_method,
        p.amount,
        p.payment_date,
        p.phone_number,
        p.payment_link,
        p.payment_status,
        p.request_id,
        p.created_at,
        p.updated_at
      FROM payments p
      WHERE p.registration_id = ${registrationId}::uuid
      ORDER BY p.created_at DESC
    `;
    
    // Converter os valores numéricos de string para número
    const processedPayments = payments.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) || 0
    }));
    
    res.json(processedPayments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching payments' });
  }
}) as any);

// Create a new payment
app.post('/api/payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { registration_id, payment_method, amount, payment_date, phone_number, payment_link, request_id } = req.body;
    if (!registration_id || !payment_method || !amount || !payment_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if registration belongs to the team
    const reg = await sql`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    const now = new Date().toISOString();
    const paymentStatus = payment_method === 'MB Way' ? 'not confirmed' : 'confirmed';
    const result = await sql`
      INSERT INTO payments (
        registration_id, payment_method, amount, payment_date, phone_number, payment_link, payment_status, request_id, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${payment_method}, ${amount}, ${payment_date}, ${phone_number}, ${payment_link}, ${paymentStatus}, ${request_id || null}, ${now}, ${now}
      ) RETURNING *
    `;
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creating payment' });
  }
}) as any);

// Create a new snackbar balance entry
app.post('/api/snackbar-balance', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { registration_id, amount, payment_method, phone_number, request_id } = req.body;
    
    if (!registration_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if registration belongs to the team
    const reg = await sql`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    
    const now = new Date().toISOString();
    
    // Determinar payment_status baseado no método de pagamento
    const paymentStatus = payment_method === 'MB Way' ? 'not confirmed' : 'confirmed';
    
    const result = await sql`
      INSERT INTO snackbar_balance (
        registration_id, amount, payment_method, phone_number, request_id, payment_status, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${amount}, ${payment_method}, ${phone_number}, ${request_id || null}, ${paymentStatus}, ${now}, ${now}
      ) RETURNING *
    `;
    
    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creating snackbar balance entry' });
  }
}) as any);

// Get snackbar balance for a camper
app.get('/api/snackbar-balance/:camperId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camperId } = req.params;
    
    // Get total balance and payment status from snackbar_balance (including negative amounts for liquidations)
    const balanceResult = await sql`
      SELECT 
        COALESCE(SUM(sb.amount), 0) as total_balance,
        CASE 
          WHEN COUNT(*) = 0 THEN 'confirmed'
          WHEN COUNT(*) = COUNT(CASE WHEN sb.payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      JOIN campers ca ON r.id = ca.registration_id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    const balance = Number(balanceResult[0]?.total_balance || 0);
    const payment_status = balanceResult[0]?.payment_status || 'confirmed';
    
    res.json({
      balance,
      total_balance: balance,
      payment_status
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar balance' });
  }
}) as any);



// Get snackbar balance for a staff member
app.get('/api/snackbar-balance/staff/:staffId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { staffId } = req.params;
    
    // Check if staff member belongs to the team (but don't filter by camp for balance calculation)
    const staffCheck = await sql`
      SELECT s.id FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE s.id = ${staffId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!staffCheck[0]) {
      return res.status(404).json({ error: 'Staff member not found or does not belong to your team' });
    }
    
    // Get total deposit and payment status for this staff member (ALL camps, not just current camp)
    const depositResult = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_deposit,
        CASE 
          WHEN COUNT(*) = 0 THEN 'confirmed'
          WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM snackbar_balance
      WHERE staff_id = ${staffId}::uuid
    `;
    
    // Get total spent for this staff member (ALL camps, not just current camp)
    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE staff_id = ${staffId}::uuid
    `;
    
    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const balance = totalDeposit - totalSpent;
    const payment_status = depositResult[0]?.payment_status || 'confirmed';
    
    // Get all balance records for this staff member (ALL camps, not just current camp)
    const balanceRecords = await sql`
      SELECT 
        id,
        amount,
        payment_method,
        payment_status,
        phone_number,
        created_at,
        updated_at
      FROM snackbar_balance
      WHERE staff_id = ${staffId}::uuid
      ORDER BY created_at DESC
    `;
    
    // Return both balance records and calculated totals
    res.json({
      balance,
      total_deposit: totalDeposit,
      total_spent: totalSpent,
      payment_status,
      records: balanceRecords
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar balance for staff' });
  }
}) as any);

// Create a new snackbar transaction
app.post('/api/snackbar-transactions', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camper_id, staff_id, amount } = req.body;
    
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    if (!camper_id && !staff_id) {
      return res.status(400).json({ error: 'Either camper_id or staff_id is required' });
    }
    
    if (camper_id && staff_id) {
      return res.status(400).json({ error: 'Cannot specify both camper_id and staff_id' });
    }
    
    let personCheck;
    
    if (camper_id) {
      // Check if camper belongs to the team
      personCheck = await sql`
        SELECT ca.id FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE ca.id = ${camper_id}::uuid AND c.team_id = ${teamId}::uuid
      `;
      
      if (!personCheck[0]) {
        return res.status(400).json({ error: 'Camper does not belong to your team' });
      }
    } else if (staff_id) {
      // Check if staff member belongs to the team
      personCheck = await sql`
        SELECT s.id FROM staff s
        JOIN camps c ON s.camp_id = c.id
        WHERE s.id = ${staff_id}::uuid AND c.team_id = ${teamId}::uuid
      `;
      
      if (!personCheck[0]) {
        return res.status(400).json({ error: 'Staff member does not belong to your team' });
      }
    }
    
    const now = new Date().toISOString();
    
    let result;
    if (camper_id) {
      
      // Get the registration_id for this camper
      const registrationResult = await sql`
        SELECT ca.registration_id FROM campers ca
        WHERE ca.id = ${camper_id}::uuid
      `;
      
      if (!registrationResult[0]?.registration_id) {
        return res.status(400).json({ error: 'Camper does not have a registration' });
      }
      
      const registrationId = registrationResult[0].registration_id;
      
      // Get total loaded from snackbar_balance (confirmed payments only)
      const balanceResult = await sql`
        SELECT 
          COALESCE(SUM(amount), 0) as total_loaded,
          CASE 
            WHEN COUNT(*) = 0 THEN 'confirmed'
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE registration_id = ${registrationId}
          AND payment_status = 'confirmed'
      `;
      
      // Get total spent from snack_bar_transactions (non-liquidated)
      const spentResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM snack_bar_transactions
        WHERE camper_id = ${camper_id}
          AND is_liquidated = false
      `;
      
      // Get total liquidated from snack_bar_transactions (liquidated)
      const liquidatedResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_liquidated
        FROM snack_bar_transactions
        WHERE camper_id = ${camper_id}
          AND is_liquidated = true
      `;
      
      const totalLoaded = Number(balanceResult[0]?.total_loaded || 0);
      const totalSpent = Number(spentResult[0]?.total_spent || 0);
      const totalLiquidated = Number(liquidatedResult[0]?.total_liquidated || 0);
      const currentBalance = Number((totalLoaded - totalSpent - totalLiquidated).toFixed(2));
      const paymentStatus = balanceResult[0]?.payment_status || 'confirmed';
      
      // Use a more precise comparison for floating point numbers
      if (currentBalance < Number(amount.toFixed(2))) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      // Verificar se o payment_status é 'confirmed'
      if (paymentStatus !== 'confirmed') {
        return res.status(400).json({ error: 'Cannot use balance that is not confirmed' });
      }
      
      // No need to deduct from snackbar_balance - just create the transaction
      // The balance will be calculated dynamically (total loaded - total spent)
      
      // Create the transaction record
      result = await sql`
        INSERT INTO snack_bar_transactions (
          camper_id, amount, created_at, is_liquidated
        ) VALUES (
          ${camper_id}::uuid, ${amount}, ${now}, false
        ) RETURNING *
      `;
    } else {
      
      // Get current balance and payment status for staff
      const balanceResult = await sql`
        SELECT 
          COALESCE(SUM(amount), 0) as total_deposit,
          CASE 
            WHEN COUNT(*) = 0 THEN 'confirmed'
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE staff_id = ${staff_id}::uuid
      `;
      
      const totalDeposit = Number(balanceResult[0]?.total_deposit || 0);
      const paymentStatus = balanceResult[0]?.payment_status || 'confirmed';
      
      // Get total spent for this staff member
      const spentResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM snack_bar_transactions
        WHERE staff_id = ${staff_id}::uuid
      `;
      
      const totalSpent = Number(spentResult[0]?.total_spent || 0);
      const currentBalance = Number((totalDeposit - totalSpent).toFixed(2));
      
      // Use a more precise comparison for floating point numbers
      if (currentBalance < Number(amount.toFixed(2))) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      // Verificar se o payment_status é 'confirmed'
      if (paymentStatus !== 'confirmed') {
        return res.status(400).json({ error: 'Cannot use balance that is not confirmed' });
      }
      
      result = await sql`
        INSERT INTO snack_bar_transactions (
          staff_id, amount, created_at, is_liquidated
        ) VALUES (
          ${staff_id}::uuid, ${amount}, ${now}, false
        ) RETURNING *
      `;
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating snackbar transaction:', error);
    res.status(500).json({ error: 'Error creating snackbar transaction', details: error.message });
  }
}) as any);

// Create independent snackbar transaction (not associated with any camper or staff)
app.post('/api/snackbar-transactions/independent', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { amount, payment_method, phone_number, description, request_id } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const now = new Date().toISOString();

    // Create payment in the payments table with NULL registration_id
    // Determinar payment_status baseado no método de pagamento
    const paymentStatus = payment_method === 'MB Way' ? 'not confirmed' : 'confirmed';
    
    const result = await sql`
      INSERT INTO payments (
        registration_id,
        payment_date,
        payment_method,
        amount,
        payment_status,
        phone_number,
        description,
        request_id,
        created_at,
        updated_at
      ) VALUES (
        NULL,
        ${now},
        ${payment_method},
        ${amount},
        ${paymentStatus},
        ${phone_number || null},
        ${description || null},
        ${request_id || null},
        ${now},
        ${now}
      ) RETURNING *
    `;

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating independent payment:', error);
    res.status(500).json({ error: 'Error creating independent payment', details: error.message });
  }
}) as any);

// Liquidate snackbar balance for a camper
app.post('/api/snackbar-balance/:camperId/liquidate', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camperId } = req.params;
    
    // Check if camper belongs to the team
    const camperCheck = await sql`
      SELECT ca.id, ca.name FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!camperCheck[0]) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }
    
    // Get total loaded from snackbar_balance (confirmed payments only)
    const balanceResult = await sql`
      SELECT 
        COALESCE(SUM(sb.amount), 0) as total_loaded,
        CASE 
          WHEN COUNT(*) = 0 THEN 'confirmed'
          WHEN COUNT(*) = COUNT(CASE WHEN sb.payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      JOIN campers ca ON r.id = ca.registration_id
      WHERE ca.id = ${camperId}::uuid 
        AND c.team_id = ${teamId}::uuid
        AND sb.payment_status = 'confirmed'
    `;
    
    // Get total spent from snack_bar_transactions (non-liquidated)
    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}
        AND is_liquidated = false
    `;
    
    // Get total liquidated from snack_bar_transactions (liquidated)
    const liquidatedResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_liquidated
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}
        AND is_liquidated = true
    `;
    
    const totalLoaded = Number(balanceResult[0]?.total_loaded || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const totalLiquidated = Number(liquidatedResult[0]?.total_liquidated || 0);
    const currentBalance = totalLoaded - totalSpent - totalLiquidated;
    const paymentStatus = balanceResult[0]?.payment_status || 'confirmed';
    
    if (currentBalance <= 0) {
      return res.status(400).json({ error: 'Camper has no balance to liquidate' });
    }
    
    // Para acampamentos que já acabaram, permitir liquidação mesmo com pagamentos não confirmados
    // Apenas verificar se há saldo disponível
    
    // Get the registration_id for this camper
    const registrationResult = await sql`
      SELECT ca.registration_id FROM campers ca
      WHERE ca.id = ${camperId}::uuid
    `;
    
    if (!registrationResult[0]?.registration_id) {
      return res.status(400).json({ error: 'Camper does not have a registration' });
    }
    
    const registrationId = registrationResult[0].registration_id;
    
    // No need to update snackbar_balance records - just create a liquidation transaction
    // The balance will be calculated dynamically (total loaded - total spent)
    
    // Create a transaction record with the total liquidated amount
    const now = new Date().toISOString();
    const transactionResult = await sql`
      INSERT INTO snack_bar_transactions (
        camper_id, amount, created_at, is_liquidated
      ) VALUES (
        ${camperId}::uuid, ${currentBalance}, ${now}, true
      ) RETURNING *
    `;
    
    res.status(200).json({
      message: 'Balance liquidated successfully',
      liquidated_amount: currentBalance,
      camper_name: camperCheck[0].name,
    });
  } catch (error) {
    console.error('Error liquidating camper balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as any);

// Liquidate snackbar balance for a staff member
app.post('/api/snackbar-balance/staff/:staffId/liquidate', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { staffId } = req.params;
    
    // Check if staff member belongs to the team
    const staffCheck = await sql`
      SELECT s.id, s.name FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE s.id = ${staffId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!staffCheck[0]) {
      return res.status(404).json({ error: 'Staff member not found or does not belong to your team' });
    }
    
    // Get total loaded from snackbar_balance (confirmed payments only)
    const balanceResult = await sql`
      SELECT 
        COALESCE(SUM(sb.amount), 0) as total_loaded,
        CASE 
          WHEN COUNT(*) = 0 THEN 'confirmed'
          WHEN COUNT(*) = COUNT(CASE WHEN sb.payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM snackbar_balance sb
      JOIN staff s ON sb.staff_id = s.id
      JOIN camps c ON s.camp_id = c.id
      WHERE s.id = ${staffId}::uuid 
        AND c.team_id = ${teamId}::uuid
        AND sb.payment_status = 'confirmed'
    `;
    
    // Get total spent from snack_bar_transactions (non-liquidated)
    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE staff_id = ${staffId}
        AND is_liquidated = false
    `;
    
    // Get total liquidated from snack_bar_transactions (liquidated)
    const liquidatedResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_liquidated
      FROM snack_bar_transactions
      WHERE staff_id = ${staffId}
        AND is_liquidated = true
    `;
    
    const totalLoaded = Number(balanceResult[0]?.total_loaded || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const totalLiquidated = Number(liquidatedResult[0]?.total_liquidated || 0);
    const currentBalance = totalLoaded - totalSpent - totalLiquidated;
    const paymentStatus = balanceResult[0]?.payment_status || 'confirmed';
    
    if (currentBalance <= 0) {
      return res.status(400).json({ error: 'Staff member has no balance to liquidate' });
    }
    
    // Para acampamentos que já acabaram, permitir liquidação mesmo com pagamentos não confirmados
    // Apenas verificar se há saldo disponível
    
    // Create a transaction record with the total liquidated amount
    const now = new Date().toISOString();
    const transactionResult = await sql`
      INSERT INTO snack_bar_transactions (
        staff_id, amount, created_at, is_liquidated
      ) VALUES (
        ${staffId}::uuid, ${currentBalance}, ${now}, true
      ) RETURNING *
    `;
    
    res.status(200).json({
      message: 'Balance liquidated successfully',
      liquidated_amount: currentBalance,
      staff_name: staffCheck[0].name,
      transaction: transactionResult[0]
    });
  } catch (error) {
    console.error('Error liquidating snackbar balance:', error);
    res.status(500).json({ error: 'Error liquidating snackbar balance', details: error.message });
  }
}) as any);

// Get transactions for a specific staff member
app.get('/api/snackbar-transactions/staff/:staffId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { staffId } = req.params;
    
    // Check if staff member belongs to the team
    const staffCheck = await sql`
      SELECT s.id FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE s.id = ${staffId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!staffCheck[0]) {
      return res.status(404).json({ error: 'Staff member not found or does not belong to your team' });
    }
    
    const transactions = await sql`
      SELECT 
        id,
        staff_id,
        amount,
        is_liquidated,
        created_at
      FROM snack_bar_transactions
      WHERE staff_id = ${staffId}::uuid
      ORDER BY created_at DESC
    `;
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar transactions' });
  }
}) as any);

// Get snackbar balance records for a specific camper
app.get('/api/snackbar-balance/camper/:camperId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camperId } = req.params;
    
    // Check if camper belongs to the team
    const camperCheck = await sql`
      SELECT ca.id FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!camperCheck[0]) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }
    
    // Get the registration_id for this camper
    const registrationResult = await sql`
      SELECT ca.registration_id FROM campers ca
      WHERE ca.id = ${camperId}::uuid
    `;
    
    if (!registrationResult[0]?.registration_id) {
      return res.status(404).json({ error: 'Camper does not have a registration' });
    }
    
    const registrationId = registrationResult[0].registration_id;
    
    // Get all snackbar balance records for this registration
    const balanceRecords = await sql`
      SELECT 
        id,
        amount,
        payment_method,
        payment_status,
        phone_number,
        created_at
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}
      ORDER BY created_at DESC
    `;
    
    res.json(balanceRecords);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar balance records' });
  }
}) as any);

// Get all transactions for a camp
app.get('/api/snackbar-transactions', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camp_id } = req.query;
    
    if (!camp_id) {
      return res.status(400).json({ error: 'Camp ID is required' });
    }
    
    // Check if camp belongs to the team
    const campCheck = await sql`
      SELECT id FROM camps WHERE id = ${camp_id}::uuid AND team_id = ${teamId}::uuid
    `;
    
    if (!campCheck[0]) {
      return res.status(404).json({ error: 'Camp not found or does not belong to your team' });
    }
    
    // Buscar transações de campistas
    const camperTransactions = await sql`
      SELECT 
        sbt.id,
        sbt.camper_id,
        sbt.amount,
        sbt.created_at,
        ca.name as person_name,
        'camper' as person_type
      FROM snack_bar_transactions sbt
      JOIN campers ca ON sbt.camper_id = ca.id
      JOIN registrations r ON ca.registration_id = r.id
      WHERE r.camp_id = ${camp_id}::uuid
    `;
    
    // Buscar transações de staff
    const staffTransactions = await sql`
      SELECT 
        sbt.id,
        sbt.staff_id,
        sbt.amount,
        sbt.created_at,
        s.name as person_name,
        'staff' as person_type
      FROM snack_bar_transactions sbt
      JOIN staff s ON sbt.staff_id = s.id
      WHERE s.camp_id = ${camp_id}::uuid
    `;
    
    // Combinar e ordenar todas as transações
    const allTransactions = [...camperTransactions, ...staffTransactions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    res.json(allTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar transactions' });
  }
}) as any);

// Get snackbar transactions for a specific camper
app.get('/api/snackbar-transactions/:camperId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camperId } = req.params;
    
    // Check if camper belongs to the team
    const camperCheck = await sql`
      SELECT ca.id FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!camperCheck[0]) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }
    
    const transactions = await sql`
      SELECT 
        id,
        camper_id,
        amount,
        is_liquidated,
        created_at
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}::uuid
      ORDER BY created_at DESC
    `;
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching snackbar transactions for camper:', error);
    res.status(500).json({ error: 'Error fetching snackbar transactions' });
  }
}) as any);

// WEBHOOKS ENDPOINTS

// Utilitário para integração real com Hookdeck
async function createHookdeckConnection(type: 'registrations' | 'payments', teamId: string) {
  const hookdeckApiKey = process.env.HOOKDECK_API_KEY
  if (!hookdeckApiKey) {
    throw new Error('HOOKDECK_API_KEY not configured')
  }

  // Forçar o uso da URL do Render para garantir que funcione
  const baseUrl = 'https://api.campy.pt'
  const webhookUrl = `${baseUrl}/api/webhooks/${type}/${teamId}`

  // 1. Criar Destination
  const timestamp = Date.now()
  const sanitizedName = `webhook-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const destinationPayload = {
    name: sanitizedName,
    config: {
      url: webhookUrl,
      method: type === 'payments' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  
  const destinationResponse = await fetch('https://api.hookdeck.com/2025-01-01/destinations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hookdeckApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(destinationPayload)
  })

  if (!destinationResponse.ok) {
    const errorText = await destinationResponse.text()
    throw new Error(`Failed to create destination: ${destinationResponse.statusText} - ${errorText}`)
  }

  const destination = await destinationResponse.json()

  // 2. Criar Source
  const sourceUrl = type === 'payments'
    ? `https://hkdk.events/${Math.random().toString(36).slice(2, 10)}?x-hookdeck-allow-methods=get`
    : `https://hkdk.events/${Math.random().toString(36).slice(2, 10)}`
  const sourceSanitizedName = `source-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const sourcePayload = {
    name: sourceSanitizedName,
    url: sourceUrl,
    config: {
      custom_response: {
        status: 200,
        content_type: 'json', // Hookdeck exige 'json', 'text' ou 'xml'
        headers: {
          'Content-Type': 'application/json'
        },
                  body: JSON.stringify({
            status: 'SUCCESS',
            message: 'Webhook received and processed successfully'
          })
      }
    }
  }

  
  const sourceResponse = await fetch('https://api.hookdeck.com/2025-01-01/sources', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hookdeckApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sourcePayload)
  })

  if (!sourceResponse.ok) {
    const errorText = await sourceResponse.text()
    throw new Error(`Failed to create source: ${sourceResponse.statusText} - ${errorText}`)
  }

  const source = await sourceResponse.json()

  // 3. Criar Connection
  const connectionSanitizedName = `connection-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const connectionPayload = {
    name: connectionSanitizedName,
    source_id: source.id,
    destination_id: destination.id
  }
  
  const connectionResponse = await fetch('https://api.hookdeck.com/2025-01-01/connections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hookdeckApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(connectionPayload)
  })

  if (!connectionResponse.ok) {
    const errorText = await connectionResponse.text()
    throw new Error(`Failed to create connection: ${connectionResponse.statusText} - ${errorText}`)
  }

  const connection = await connectionResponse.json()

  const result = {
    connection: { id: connection.id },
    source: { id: source.id, url: source.url },
    destination: { id: destination.id },
    webhookUrl: source.url
  }
  
  return result
}

async function deleteHookdeckConnection(connectionId: string) {
  const hookdeckApiKey = process.env.HOOKDECK_API_KEY
  if (!hookdeckApiKey) {
    throw new Error('HOOKDECK_API_KEY not configured')
  }

  const response = await fetch(`https://api.hookdeck.com/2025-01-01/connections/${connectionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${hookdeckApiKey}`
    }
  })

  // Se a connection não existe (404), consideramos sucesso
  if (response.status === 404) {
    return true
  }

  if (!response.ok) {
    throw new Error(`Failed to delete connection: ${response.statusText}`)
  }

  return true
}

async function deleteHookdeckResources(connectionId: string, sourceId?: string, destinationId?: string) {
  const hookdeckApiKey = process.env.HOOKDECK_API_KEY
  if (!hookdeckApiKey) {
    throw new Error('HOOKDECK_API_KEY not configured')
  }


  const headers = {
    'Authorization': `Bearer ${hookdeckApiKey}`,
    'Content-Type': 'application/json'
  }

  // 1. Deletar connection
  try {
    await deleteHookdeckConnection(connectionId)
  } catch {
  }

  // 2. Deletar source se fornecido
  if (sourceId) {
    try {
      const sourceResponse = await fetch(`https://api.hookdeck.com/2025-01-01/sources/${sourceId}`, {
        method: 'DELETE',
        headers
      })
      
      if (sourceResponse.status === 404) {
        // Source not found, assuming already deleted
      } else if (sourceResponse.ok) {
        // Successfully deleted source
      } else {
        // Failed to delete source
      }
    } catch {
      // Error deleting source
    }
  }

  // 3. Deletar destination se fornecido
  if (destinationId) {
    try {
      const destinationResponse = await fetch(`https://api.hookdeck.com/2025-01-01/destinations/${destinationId}`, {
        method: 'DELETE',
        headers
      })
      
      if (destinationResponse.status === 404) {
        // Destination not found, assuming already deleted
      } else if (destinationResponse.ok) {
        // Successfully deleted destination
      } else {
        // Failed to delete destination
      }
    } catch {
      // Error deleting destination
    }
  }

  return true
}

// 1. GET /api/webhooks/config
app.get('/api/webhooks/config', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }
    const result = await sql`
      SELECT * FROM webhook_configs WHERE team_id = ${teamId}::uuid
    `
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// 2. POST /api/webhooks/config
app.post('/api/webhooks/config', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }
    const {
      apiKey,
      registrationWebhook,
      paymentWebhook,
      isConnected,
      registrationWebhookUrl,
      paymentWebhookUrl,
      hookdeckData
    } = req.body

    // Upsert config (um por time)
    const result = await sql`
      INSERT INTO webhook_configs (
        team_id, api_key, registration_webhook, payment_webhook, is_connected,
        registration_webhook_url, payment_webhook_url, hookdeck_data, updated_at
      ) VALUES (
        ${teamId}::uuid, ${apiKey}, ${registrationWebhook}, ${paymentWebhook}, ${isConnected},
        ${registrationWebhookUrl}, ${paymentWebhookUrl}, ${JSON.stringify(hookdeckData)}, NOW()
      )
      ON CONFLICT (team_id) DO UPDATE SET
        api_key = EXCLUDED.api_key,
        registration_webhook = EXCLUDED.registration_webhook,
        payment_webhook = EXCLUDED.payment_webhook,
        is_connected = EXCLUDED.is_connected,
        registration_webhook_url = EXCLUDED.registration_webhook_url,
        payment_webhook_url = EXCLUDED.payment_webhook_url,
        hookdeck_data = EXCLUDED.hookdeck_data,
        updated_at = NOW()
      RETURNING *
    `
    return res.status(200).json(result[0])
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// 3. POST /api/webhooks/setup
app.post('/api/webhooks/setup', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }
    const { webhookType } = req.body
    if (!['registrations', 'payments'].includes(webhookType)) {
      return res.status(400).json({ error: 'Invalid webhook type' })
    }
    
    // Criar connection real no Hookdeck
    const hookdeck = await createHookdeckConnection(webhookType, teamId)
    return res.status(200).json(hookdeck)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// 4. DELETE /api/webhooks/cleanup
app.delete('/api/webhooks/cleanup', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    const { connectionId, sourceId, destinationId, webhookType } = req.body
    
    if (!connectionId) {
      return res.status(400).json({ error: 'Connection ID is required' })
    }
    
    // Remover todos os recursos do Hookdeck (connection, source, destination)
    try {
      await deleteHookdeckResources(connectionId, sourceId, destinationId)
    } catch {
      // Continuamos mesmo se falhar no Hookdeck, pois pode já ter sido deletado
    }
    
    // Atualizar estado na base de dados
    try {
      if (webhookType) {
        const webhookPropName = webhookType === 'registrations' ? 'registration_webhook' : 'payment_webhook'
        const webhookUrlPropName = webhookType === 'registrations' ? 'registration_webhook_url' : 'payment_webhook_url'
        
        // Buscar configuração atual
        const currentConfig = await sql`
          SELECT * FROM webhook_configs WHERE team_id = ${teamId}::uuid
        `
        
        if (currentConfig.length > 0) {
          const config = currentConfig[0]
          const hookdeckData = config.hookdeck_data || {}
          
          // Remover dados do webhook específico
          delete hookdeckData[webhookType]
          
          // Verificar se ainda há webhooks ativos
          const hasActiveWebhooks = (webhookType === 'registrations' ? false : config.registration_webhook) || 
                                   (webhookType === 'payments' ? false : config.payment_webhook)
          
          // Atualizar configuração
          await sql`
            UPDATE webhook_configs 
            SET 
              ${webhookPropName} = false,
              ${webhookUrlPropName} = '',
              hookdeck_data = ${JSON.stringify(hookdeckData)},
              is_connected = ${hasActiveWebhooks},
              updated_at = NOW()
            WHERE team_id = ${teamId}::uuid
          `
          
          // Updated database state
        }
      }
    } catch {
      // Não falhamos a operação se a atualização do DB falhar
    }
    
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)



// Recebe webhooks de inscrições
app.post('/api/webhooks/registrations/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    // Lê o request_id do header enviado pelo Hookdeck
    const request_id = req.headers['x-hookdeck-requestid'] as string | undefined;

    const {
      name,
      email,
      contact,
      form_id,
      camp_id,
      status,
      id_number,
      sns_number,
      date_of_birth,
      dietary_restrictions,
      guardian_name,
      guardian_email,
      guardian_phone
    } = req.body;

    // Validação dos campos obrigatórios
    const errors: string[] = [];
    if (!name) errors.push('name is required');
    if (!email) errors.push('email is required');
    if (!contact) errors.push('contact is required');
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Validar se o teamId é válido
    const teamResult = await sql`SELECT id FROM teams WHERE id = ${teamId}::uuid`;
    if (!teamResult[0]) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Se camp_id for enviado, validar se pertence ao time
    if (camp_id) {
      const camp = await sql`SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}`;
      if (!camp[0]) {
        return res.status(400).json({ error: 'Camp does not belong to your team' });
      }
    }

    // Validar se form_id já existe (se fornecido)
    if (form_id) {
      const existingFormId = await sql`
        SELECT r.id FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE r.form_id = ${form_id} AND c.team_id = ${teamId}::uuid
      `;
      
      if (existingFormId.length > 0) {
        return res.status(400).json({ 
          error: 'Form ID already exists',
          message: 'Este Form ID já está registado no sistema'
        });
      }
    }

    // Criar registration (sem team_id)
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO registrations (
        camp_id, name, email, contact, status, form_id, id_number, sns_number, date_of_birth, dietary_restrictions, guardian_name, guardian_email, guardian_phone, request_id, created_at, updated_at
      ) VALUES (
        ${camp_id || null}, ${name}, ${email}, ${contact}, ${status || 'unpaid'}, ${form_id || null}, ${id_number || null}, ${sns_number || null}, ${date_of_birth || null}, ${dietary_restrictions || null}, ${guardian_name || null}, ${guardian_email || null}, ${guardian_phone || null}, ${request_id || null}, ${now}, ${now}
      ) RETURNING *
    `;

    

    return res.status(200).json({
      success: true,
      message: 'Registration created successfully',
      registration: result[0]
    });
  } catch (error) {
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verificar se form_id já existe
app.get('/api/registrations/check-form-id/:formId', (async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const teamId = getTeamId(req);

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' });
    }

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Verificar se o form_id já existe
    const existingFormId = await sql`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.form_id = ${formId} AND c.team_id = ${teamId}::uuid
    `;
    
    const exists = existingFormId.length > 0;
    
    return res.status(200).json({
      exists,
      message: exists ? 'Este Form ID já está registado no sistema' : 'Form ID disponível'
    });
  } catch (error) {
    console.error('Error checking form_id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}) as any);

// Recebe webhooks de pagamentos
app.get('/api/webhooks/payments/:teamId', async (req: Request, res: Response) => {
  try {
    // Desestruturação correta dos parâmetros
    const teamId = req.params.teamId;
    // req.query é do tipo ParsedQs, então os valores podem ser string | string[] | undefined
    // Para garantir que temos strings, vamos forçar o cast
    const request_id = req.query.request_id as string | undefined;
    const amount = req.query.amount as string | undefined;
    const phone_number = req.query.phone_number as string | undefined;
    const email = req.query.email as string | undefined;
    const payment_method = req.query.payment_method as string | undefined;
    const payment_date = req.query.payment_date as string | undefined;
    const payment_status = req.query.payment_status as string | undefined;
    const payment_link = req.query.payment_link as string | undefined;
    const status = req.query.status as string | undefined;

    // Validação dos campos obrigatórios
    const errors: string[] = [];
    if (!amount) errors.push('amount is required');
    if (!email && !request_id) errors.push('email or request_id query parameter is required');
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Validar se o teamId é válido
    const teamResult = await sql`SELECT id FROM teams WHERE id = ${teamId}::uuid`;
    if (!teamResult[0]) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const now = new Date().toISOString();
    let registration: any = null;
    let result: any = null;

    // Lógica baseada no tipo de request_id
    if (request_id) {
      const requestIdStr = request_id;
      
      if (requestIdStr.startsWith('R')) {
        // UPDATE na tabela payments - confirmar pagamento existente
        const paymentUpdate = await sql`
          UPDATE payments 
          SET payment_status = 'confirmed', updated_at = ${now}
          WHERE request_id = ${request_id} AND registration_id IN (
            SELECT r.id FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE c.team_id = ${teamId}::uuid
          )
          RETURNING *
        `;
        
        if (paymentUpdate.length === 0) {
          return res.status(404).json({ error: 'Payment not found or does not belong to your team' });
        }
        
        result = paymentUpdate[0];
        
        // Buscar registration para resposta
        const regResult = await sql`
          SELECT r.* FROM registrations r
          WHERE r.id = ${result.registration_id}
        `;
        registration = regResult[0];
        
      } else if (requestIdStr.startsWith('S') || requestIdStr.startsWith('SV')) {
        // UPDATE na tabela snackbar_balance - confirmar pagamento existente
        
        // Se for SV, tenta primeiro na payments (pagamento independente)
        if (requestIdStr.startsWith('SV')) {
          
          const independentPaymentUpdate = await sql`
            UPDATE payments 
            SET payment_status = 'confirmed', updated_at = ${now}
            WHERE request_id = ${request_id} AND registration_id IS NULL
            RETURNING *
          `;
          
          console.log('Independent payment update result:', independentPaymentUpdate.length);
          
          if (independentPaymentUpdate.length > 0) {
            // Mock registration para pagamentos independentes
            registration = {
              id: independentPaymentUpdate[0].id,
              name: 'Pagamento Independente',
              email: 'independent@snackbar.com',
              status: 'confirmed'
            };
            result = independentPaymentUpdate[0];
          }
        }
        
        // Se não encontrou pagamento independente, tenta na snackbar_balance
        if (!result) {
          const existingSnackbarPayments = await sql`
            SELECT sb.*, r.name as camper_name, s.name as staff_name
            FROM snackbar_balance sb
            LEFT JOIN registrations r ON sb.registration_id = r.id
            LEFT JOIN staff s ON sb.staff_id = s.id
            LEFT JOIN camps c ON (r.camp_id = c.id OR s.camp_id = c.id)
            WHERE c.team_id = ${teamId}::uuid
            ORDER BY sb.created_at DESC
            LIMIT 10
          `;
          
          console.log('Existing snackbar payments for team:', existingSnackbarPayments);
          
          // Tenta match exato
          let snackbarUpdate = await sql`
            UPDATE snackbar_balance 
            SET payment_status = 'confirmed', updated_at = ${now}
            WHERE request_id = ${request_id} AND (
              (registration_id IS NOT NULL AND registration_id IN (
                SELECT r.id FROM registrations r
                JOIN camps c ON r.camp_id = c.id
                WHERE c.team_id = ${teamId}::uuid
              ))
              OR (staff_id IS NOT NULL AND staff_id IN (
                SELECT s.id FROM staff s
                JOIN camps c ON s.camp_id = c.id
                WHERE c.team_id = ${teamId}::uuid
              ))
            )
            RETURNING *
          `;
          
          console.log('Snackbar update result (exact match):', snackbarUpdate.length);
        
          // Se não encontrou e for SV, tenta match parcial
          if (snackbarUpdate.length === 0 && requestIdStr.startsWith('SV')) {
            console.log('Trying partial match for SV format');
            
            snackbarUpdate = await sql`
              UPDATE snackbar_balance 
              SET payment_status = 'confirmed', updated_at = ${now}
              WHERE payment_status = 'not confirmed' AND (
                (registration_id IS NOT NULL AND registration_id IN (
                  SELECT r.id FROM registrations r
                  JOIN camps c ON r.camp_id = c.id
                  WHERE c.team_id = ${teamId}::uuid
                ))
                OR (staff_id IS NOT NULL AND staff_id IN (
                  SELECT s.id FROM staff s
                  JOIN camps c ON s.camp_id = c.id
                  WHERE c.team_id = ${teamId}::uuid
                ))
              )
              ORDER BY created_at DESC
              LIMIT 1
              RETURNING *
            `;
            
            console.log('Snackbar update result (partial match):', snackbarUpdate.length);
            
            // Se ainda não encontrou, tenta novamente na payments (independente)
            if (snackbarUpdate.length === 0) {
              console.log('Trying to find independent payment in payments table');
              
              const independentPaymentUpdate = await sql`
                UPDATE payments 
                SET payment_status = 'confirmed', updated_at = ${now}
                WHERE request_id = ${request_id} AND registration_id IS NULL
                RETURNING *
              `;
              
              console.log('Independent payment update result:', independentPaymentUpdate.length);
              
              if (independentPaymentUpdate.length > 0) {
                registration = {
                  id: independentPaymentUpdate[0].id,
                  name: 'Pagamento Independente',
                  email: 'independent@snackbar.com',
                  status: 'confirmed'
                };
                result = independentPaymentUpdate[0];
              }
            }
          }
          
          if (snackbarUpdate.length === 0) {
            // Busca pagamentos similares para debug
            const similarRequestId = await sql`
              SELECT sb.*, r.name as camper_name, s.name as staff_name
              FROM snackbar_balance sb
              LEFT JOIN registrations r ON sb.registration_id = r.id
              LEFT JOIN staff s ON sb.staff_id = s.id
              LEFT JOIN camps c ON (r.camp_id = c.id OR s.camp_id = c.id)
              WHERE c.team_id = ${teamId}::uuid
              AND sb.request_id LIKE 'S%'
              AND sb.payment_status = 'not confirmed'
              ORDER BY sb.created_at DESC
              LIMIT 5
            `;
            
            return res.status(404).json({ 
              error: 'Snackbar payment not found or does not belong to your team',
              debug: {
                request_id,
                teamId,
                existingPayments: existingSnackbarPayments.map((p: any) => ({
                  id: p.id,
                  request_id: p.request_id,
                  registration_id: p.registration_id,
                  staff_id: p.staff_id,
                  payment_status: p.payment_status
                })),
                similarRequestIds: similarRequestId.map((p: any) => ({
                  id: p.id,
                  request_id: p.request_id,
                  registration_id: p.registration_id,
                  staff_id: p.staff_id,
                  payment_status: p.payment_status,
                  camper_name: p.camper_name,
                  staff_name: p.staff_name
                }))
              }
            });
          }
          
          result = snackbarUpdate[0];
          
          // Buscar registration ou staff para resposta
          if (result.registration_id) {
            const regResult = await sql`
              SELECT r.* FROM registrations r
              WHERE r.id = ${result.registration_id}
            `;
            registration = regResult[0];
          } else if (result.staff_id) {
            const staffResult = await sql`
              SELECT s.* FROM staff s
              WHERE s.id = ${result.staff_id}
            `;
            registration = staffResult[0] ? {
              id: staffResult[0].id,
              name: staffResult[0].name,
              email: staffResult[0].email,
              status: 'confirmed'
            } : null;
          }
        }
        
      } else {
        // INSERT na tabela payments - novo pagamento
        console.log('Processing new payment with form_id');
        // Buscar registration por form_id (que vem no request_id)
        const regResult = await sql`
          SELECT r.*, c.price as camp_price FROM registrations r
          LEFT JOIN camps c ON r.camp_id = c.id
          WHERE r.form_id = ${request_id} AND c.team_id = ${teamId}::uuid
          ORDER BY r.created_at DESC LIMIT 1
        `;
        registration = regResult[0];
        
        if (!registration) {
          return res.status(404).json({ error: 'Registration not found' });
        }
        
        // Criar novo pagamento com os valores default e os da query
        const paymentInsert = await sql`
          INSERT INTO payments (
            registration_id, payment_method, amount, payment_date, payment_status, payment_link, phone_number, request_id, created_at, updated_at
          ) VALUES (
            ${registration.id}, 'MB Way', ${amount}, ${now}, 'confirmed', null, ${phone_number || null}, ${request_id}, ${now}, ${now}
          ) RETURNING *
        `;
        
        result = paymentInsert[0];
      }
      
    } else if (email) {
      // Buscar registration por email
      const regResult = await sql`
        SELECT r.*, c.price as camp_price FROM registrations r
        LEFT JOIN camps c ON r.camp_id = c.id
        WHERE r.email = ${email} AND c.team_id = ${teamId}
        ORDER BY r.created_at DESC LIMIT 1
      `;
      registration = regResult[0];
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      
      // Criar novo pagamento
      const paymentInsert = await sql`
        INSERT INTO payments (
          registration_id, payment_method, amount, payment_date, payment_status, payment_link, phone_number, request_id, created_at, updated_at
        ) VALUES (
          ${registration.id}, ${payment_method || 'webhook'}, ${amount}, ${payment_date || now}, ${payment_status || 'confirmed'}, ${payment_link || null}, ${phone_number || null}, ${request_id || null}, ${now}, ${now}
        ) RETURNING *
      `;
      
      result = paymentInsert[0];
    }

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Atualizar status do registro se enviado
    let updatedRegistration = registration;
    if (status) {
      const regUpdate = await sql`
        UPDATE registrations SET status = ${status}, updated_at = ${now} WHERE id = ${registration.id} RETURNING *
      `;
      updatedRegistration = regUpdate[0] || registration;
    }

    // Calcular total pago
    const totalPaidResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE registration_id = ${registration.id}
    `;
    const totalPaid = Number(totalPaidResult[0]?.total_paid || 0);

    // Atenção ao uso de {}: garantir que não há undefined ou null em campos obrigatórios
    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      registration: {
        id: updatedRegistration.id,
        total_amount_paid: totalPaid,
        status: updatedRegistration.status,
        email: updatedRegistration.email,
        name: updatedRegistration.name
      },
      payment: {
        amount: Number(amount),
        total_paid: totalPaid,
        status: updatedRegistration.status,
        payment_method: result && result.payment_method ? result.payment_method : 'MB Way',
        payment_status: result && result.payment_status ? result.payment_status : 'confirmed'
      }
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// Endpoint to check current team tier
app.get('/api/teams/:id/tier', (async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const teamId = getTeamId(req)
    
    if (!teamId) {
      return res.status(401).json({ error: 'Missing x-team-id header' })
    }

    // Ensure user can only check their own team
    if (id !== teamId) {
      return res.status(403).json({ error: 'You can only check your own team' })
    }

    const result = await sql`
      SELECT tier FROM teams WHERE id = ${teamId}::uuid
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    return res.status(200).json({ tier: result[0].tier })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// STAFF ENDPOINTS

// List all staff for the current team (optimized with single query)
app.get('/api/staff', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    // Single optimized query that calculates all balances in one go
    const staff = await sql`
      SELECT 
        s.*,
        c.name as camp_name,
        COALESCE(sb.total_loaded, 0) as total_loaded,
        COALESCE(sbt_spent.total_spent, 0) as total_spent,
        COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
        (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
        CASE 
          WHEN sb.total_loaded IS NULL THEN 'confirmed'
          WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM staff s
      JOIN camps c ON s.camp_id = c.id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_loaded,
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE payment_status = 'confirmed'
        GROUP BY staff_id
      ) sb ON s.id = sb.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_spent
        FROM snack_bar_transactions
        WHERE is_liquidated = false
        GROUP BY staff_id
      ) sbt_spent ON s.id = sbt_spent.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_liquidated
        FROM snack_bar_transactions
        WHERE is_liquidated = true
        GROUP BY staff_id
      ) sbt_liquidated ON s.id = sbt_liquidated.staff_id
      WHERE c.team_id = ${teamId}
      ORDER BY s.created_at DESC
    `;

    // Process results to match expected format
    const processedStaff = staff.map((staffMember: any) => ({
      ...staffMember,
      snack_bar_balance: Number(staffMember.snack_bar_balance) || 0,
      totalLoaded: Number(staffMember.total_loaded) || 0,
      totalSpent: Number(staffMember.total_spent) || 0,
      totalLiquidated: Number(staffMember.total_liquidated) || 0,
      payment_status: staffMember.payment_status || 'confirmed'
    }));

    res.json(processedStaff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Erro ao buscar staff.' });
  }
}) as any);

// Get a single staff member by ID with balance
app.get('/api/staff/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const staff = await sql`
      SELECT 
        s.*,
        c.name as camp_name,
        COALESCE(sb.total_loaded, 0) as total_loaded,
        COALESCE(sbt_spent.total_spent, 0) as total_spent,
        COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
        (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
        CASE 
          WHEN sb.total_loaded IS NULL THEN 'confirmed'
          WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM staff s
      JOIN camps c ON s.camp_id = c.id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_loaded,
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE payment_status = 'confirmed'
        GROUP BY staff_id
      ) sb ON s.id = sb.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_spent
        FROM snack_bar_transactions
        WHERE is_liquidated = false
        GROUP BY staff_id
      ) sbt_spent ON s.id = sbt_spent.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_liquidated
        FROM snack_bar_transactions
        WHERE is_liquidated = true
        GROUP BY staff_id
      ) sbt_liquidated ON s.id = sbt_liquidated.staff_id
      WHERE s.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    if (!staff[0]) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    // Process result to match expected format
    const processedStaff = {
      ...staff[0],
      snack_bar_balance: Number(staff[0].snack_bar_balance) || 0,
      totalLoaded: Number(staff[0].total_loaded) || 0,
      totalSpent: Number(staff[0].total_spent) || 0,
      totalLiquidated: Number(staff[0].total_liquidated) || 0,
      payment_status: staff[0].payment_status || 'confirmed'
    };
    
    res.json(processedStaff);
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({ error: 'Erro ao buscar membro do staff.' });
  }
}) as any);

// Get simple list of campers for dropdowns (without balance calculations)
app.get('/api/campers/simple', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camp_id } = req.query;
    
    let campers;
    if (camp_id) {
      campers = await sql`
        SELECT 
          ca.id,
          ca.name,
          ca.email,
          ca.contact,
          r.form_id,
          c.name as camp_name,
          'camper' as type
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId} AND c.id = ${camp_id}
        ORDER BY ca.name ASC
      `;
    } else {
      campers = await sql`
        SELECT 
          ca.id,
          ca.name,
          ca.email,
          ca.contact,
          r.form_id,
          c.name as camp_name,
          'camper' as type
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}
        ORDER BY ca.name ASC
      `;
    }

    res.json(campers);
  } catch (error) {
    console.error('Error fetching simple campers list:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de campistas.' });
  }
}) as any);

// Get simple list of staff for dropdowns (without balance calculations)
app.get('/api/staff/simple', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const staff = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.phone,
        c.name as camp_name,
        'staff' as type
      FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE c.team_id = ${teamId}
      ORDER BY s.name ASC
    `;

    res.json(staff);
  } catch (error) {
    console.error('Error fetching simple staff list:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de staff.' });
  }
}) as any);

// Get combined simple list of campers and staff for dropdowns
app.get('/api/people/simple', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camp_id } = req.query;
    
    // Get campers
    let campers;
    if (camp_id) {
      campers = await sql`
        SELECT 
          ca.id,
          ca.name,
          ca.email,
          ca.contact,
          r.form_id,
          c.name as camp_name,
          'camper' as type
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId} AND c.id = ${camp_id}
        ORDER BY ca.name ASC
      `;
    } else {
      campers = await sql`
        SELECT 
          ca.id,
          ca.name,
          ca.email,
          ca.contact,
          r.form_id,
          c.name as camp_name,
          'camper' as type
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}
        ORDER BY ca.name ASC
      `;
    }

    // Get staff
    const staff = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.phone as contact,
        NULL as form_id,
        c.name as camp_name,
        'staff' as type
      FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE c.team_id = ${teamId}
      ORDER BY s.name ASC
    `;

    // Combine and sort by name
    const allPeople = [...campers, ...staff].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    res.json(allPeople);
  } catch (error) {
    console.error('Error fetching simple people list:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de pessoas.' });
  }
}) as any);

// Get a single person by ID with balance (for snack-bar selection)
app.get('/api/people/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    
    // First try to find as camper
    let person = await sql`
      SELECT 
        ca.id,
        ca.name,
        ca.email,
        ca.contact,
        r.form_id,
        c.name as camp_name,
        'camper' as type,
        COALESCE(sb.total_loaded, 0) as total_loaded,
        COALESCE(sbt_spent.total_spent, 0) as total_spent,
        COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
        (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
        CASE 
          WHEN sb.total_loaded IS NULL THEN 'confirmed'
          WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      LEFT JOIN (
        SELECT 
          registration_id,
          SUM(amount) as total_loaded,
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE payment_status = 'confirmed'
        GROUP BY registration_id
      ) sb ON r.id = sb.registration_id
      LEFT JOIN (
        SELECT 
          camper_id,
          SUM(amount) as total_spent
        FROM snack_bar_transactions
        WHERE is_liquidated = false
        GROUP BY camper_id
      ) sbt_spent ON ca.id = sbt_spent.camper_id
      LEFT JOIN (
        SELECT 
          camper_id,
          SUM(amount) as total_liquidated
        FROM snack_bar_transactions
        WHERE is_liquidated = true
        GROUP BY camper_id
      ) sbt_liquidated ON ca.id = sbt_liquidated.camper_id
      WHERE ca.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    
    if (person.length > 0) {
      // Found as camper
      const camper = person[0];
      return res.json({
        id: camper.id,
        name: camper.name,
        email: camper.email,
        contact: camper.contact,
        form_id: camper.form_id,
        camp_name: camper.camp_name,
        type: 'camper',
        snack_bar_balance: Number(camper.snack_bar_balance) || 0,
        totalLoaded: Number(camper.total_loaded) || 0,
        totalSpent: Number(camper.total_spent) || 0,
        totalLiquidated: Number(camper.total_liquidated) || 0,
        payment_status: camper.payment_status || 'confirmed'
      });
    }
    
    // If not found as camper, try as staff
    person = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.phone as contact,
        NULL as form_id,
        c.name as camp_name,
        'staff' as type,
        COALESCE(sb.total_loaded, 0) as total_loaded,
        COALESCE(sbt_spent.total_spent, 0) as total_spent,
        COALESCE(sbt_liquidated.total_liquidated, 0) as total_liquidated,
        (COALESCE(sb.total_loaded, 0) - COALESCE(sbt_spent.total_spent, 0) - COALESCE(sbt_liquidated.total_liquidated, 0)) as snack_bar_balance,
        CASE 
          WHEN sb.total_loaded IS NULL THEN 'confirmed'
          WHEN sb.payment_status = 'confirmed' THEN 'confirmed'
          ELSE 'not confirmed'
        END as payment_status
      FROM staff s
      JOIN camps c ON s.camp_id = c.id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_loaded,
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) THEN 'confirmed'
            ELSE 'not confirmed'
          END as payment_status
        FROM snackbar_balance
        WHERE payment_status = 'confirmed'
        GROUP BY staff_id
      ) sb ON s.id = sb.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_spent
        FROM snack_bar_transactions
        WHERE is_liquidated = false
        GROUP BY staff_id
      ) sbt_spent ON s.id = sbt_spent.staff_id
      LEFT JOIN (
        SELECT 
          staff_id,
          SUM(amount) as total_liquidated
        FROM snack_bar_transactions
        WHERE is_liquidated = true
        GROUP BY staff_id
      ) sbt_liquidated ON s.id = sbt_liquidated.staff_id
      WHERE s.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    
    if (person.length > 0) {
      // Found as staff
      const staff = person[0];
      return res.json({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        contact: staff.contact,
        form_id: staff.form_id,
        camp_name: staff.camp_name,
        type: 'staff',
        snack_bar_balance: Number(staff.snack_bar_balance) || 0,
        totalLoaded: Number(staff.total_loaded) || 0,
        totalSpent: Number(staff.total_spent) || 0,
        totalLiquidated: Number(staff.total_liquidated) || 0,
        payment_status: staff.payment_status || 'confirmed'
      });
    }
    
    // Person not found
    return res.status(404).json({ error: 'Person not found' });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa.' });
  }
}) as any);

// Create a new staff member
app.post('/api/staff', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { name, email, phone, camp_id } = req.body;
    if (!name || !email || !phone || !camp_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if camp belongs to the team
    const camp = await sql`
      SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}
    `;
    if (!camp[0]) {
      return res.status(400).json({ error: 'Camp does not belong to your team' });
    }
    
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO staff (name, email, phone, camp_id, created_at, updated_at)
      VALUES (${name}, ${email}, ${phone}, ${camp_id}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar membro do staff.' });
  }
}) as any);

// Update a staff member
app.put('/api/staff/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { name, email, phone, camp_id } = req.body;
    
    // Check if camp_id is provided and belongs to the team
    if (camp_id !== undefined) {
      const campCheck = await sql`
        SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}
      `;
      if (!campCheck[0]) {
        return res.status(400).json({ error: 'Camp does not belong to your team' });
      }
    }
    
    const now = new Date().toISOString();
    
    // Build the update query using template literals
    let updateQuery = sql`UPDATE staff SET updated_at = ${now}`;
    
    if (name !== undefined) {
      updateQuery = sql`${updateQuery}, name = ${name}`;
    }
    if (email !== undefined) {
      updateQuery = sql`${updateQuery}, email = ${email}`;
    }
    if (phone !== undefined) {
      updateQuery = sql`${updateQuery}, phone = ${phone}`;
    }
    if (camp_id !== undefined) {
      updateQuery = sql`${updateQuery}, camp_id = ${camp_id}`;
    }
    
    const result = await sql`
      ${updateQuery}
      WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId})
      RETURNING *
    `;
    
    if (!result[0]) {
      return res.status(404).json({ error: 'Staff member not found or you do not have permission to update it' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ error: 'Erro ao atualizar membro do staff.' });
  }
}) as any);

// Delete a staff member
app.delete('/api/staff/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`
      DELETE FROM staff WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Staff member not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar membro do staff.' });
  }
}) as any);

// Add snackbar balance for staff
app.post('/api/staff-snackbar-balance', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { staff_id, amount, payment_method, phone_number, request_id } = req.body;
    
    if (!staff_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if staff member belongs to the team
    const staffCheck = await sql`
      SELECT s.id FROM staff s
      JOIN camps c ON s.camp_id = c.id
      WHERE s.id = ${staff_id} AND c.team_id = ${teamId}
    `;
    
    if (!staffCheck[0]) {
      return res.status(400).json({ error: 'Staff member does not belong to your team' });
    }
    
    const now = new Date().toISOString();
    
    // Determinar payment_status baseado no método de pagamento
    const paymentStatus = payment_method === 'MB Way' ? 'not confirmed' : 'confirmed';
    
    const result = await sql`
      INSERT INTO snackbar_balance (
        staff_id, amount, payment_method, phone_number, request_id, payment_status, created_at, updated_at
      ) VALUES (
        ${staff_id}, ${amount}, ${payment_method}, ${phone_number}, ${request_id || null}, ${paymentStatus}, ${now}, ${now}
      ) RETURNING *
    `;
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating snackbar balance entry for staff:', error);
    res.status(500).json({ error: 'Error creating snackbar balance entry for staff', details: error.message });
  }
}) as any);

// Debug endpoint to check database schema
app.get('/api/debug/schema', (async (req: Request, res: Response) => {
  try {
    const result = await sql`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('staff', 'snackbar_balance', 'snack_bar_transactions')
      ORDER BY table_name, ordinal_position
    `;
    
    res.json(result);
  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({ error: 'Error checking schema', details: error.message });
  }
}) as any)

// Debug endpoint to check user data
app.get('/api/debug/user/:id', (async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await sql`
      SELECT id, email, first_name, last_name, team_id, role, language, created_at, updated_at
      FROM public.users
      WHERE id = ${id}::uuid
    `
    res.json(result[0] || { error: 'User not found' })
  } catch (error) {
    console.error('Error checking user data:', error)
    res.status(500).json({ error: 'Error checking user data', details: error.message })
  }
}) as any);

// Debug endpoint to check snackbar payments
app.get('/api/debug/snackbar-payments/:teamId', (async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params
    const result = await sql`
      SELECT 
        sb.id,
        sb.request_id,
        sb.registration_id,
        sb.staff_id,
        sb.amount,
        sb.payment_method,
        sb.payment_status,
        sb.created_at,
        r.name as camper_name,
        s.name as staff_name
      FROM snackbar_balance sb
      LEFT JOIN registrations r ON sb.registration_id = r.id
      LEFT JOIN staff s ON sb.staff_id = s.id
      LEFT JOIN camps c ON (r.camp_id = c.id OR s.camp_id = c.id)
      WHERE c.team_id = ${teamId}::uuid
      ORDER BY sb.created_at DESC
      LIMIT 20
    `
    res.json(result)
  } catch (error) {
    console.error('Error checking snackbar payments:', error)
    res.status(500).json({ error: 'Error checking snackbar payments', details: error.message })
  }
}) as any);

// Get snackbar balance records for a specific camper
app.get('/api/snackbar-balance/camper/:camperId', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camperId } = req.params;
    
    // Check if camper belongs to the team
    const camperCheck = await sql`
      SELECT ca.id, ca.registration_id FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!camperCheck[0]) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }
    
    const registrationId = camperCheck[0].registration_id;
    
    // Get all snackbar_balance records for this registration
    const balanceRecords = await sql`
      SELECT 
        id,
        registration_id,
        staff_id,
        amount,
        payment_method,
        phone_number,
        created_at,
        updated_at
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}::uuid
      ORDER BY created_at DESC
    `;
    
    res.json(balanceRecords);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snackbar balance records' });
  }
}) as any);

// MBWay Integration Endpoints

// Get MBWay integration for current team
app.get('/api/integrations/mbway', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const result = await sql`
      SELECT id, mbway_key, is_active, created_at, updated_at
      FROM mbway_integrations 
      WHERE team_id = ${teamId}::uuid
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'MBWay integration not found' })
    }

    // Decrypt the mbway_key before sending to frontend
    const integration = result[0]
    if (integration.mbway_key) {
      try {
        integration.mbway_key = decrypt(integration.mbway_key)
      } catch {
        return res.status(500).json({ error: 'Error decrypting integration data' })
      }
    }

    res.json(integration)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar integração MBWay.' })
  }
}) as any)

// Create MBWay integration
app.post('/api/integrations/mbway', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const { mbway_key, is_active } = req.body
    if (!mbway_key) {
      return res.status(400).json({ error: 'MBWay key is required' })
    }

    // Encrypt the mbway_key before storing in database
    const encryptedKey = encrypt(mbway_key)

    const result = await sql`
      INSERT INTO mbway_integrations (team_id, mbway_key, is_active, created_at, updated_at)
      VALUES (${teamId}::uuid, ${encryptedKey}, ${is_active}, NOW(), NOW())
      RETURNING id, mbway_key, is_active, created_at, updated_at
    `

    // Decrypt the key before sending response
    const integration = result[0]
    if (integration.mbway_key) {
      integration.mbway_key = decrypt(integration.mbway_key)
    }

    res.status(201).json(integration)
  } catch {
    res.status(500).json({ error: 'Erro ao criar integração MBWay.' })
  }
}) as any)

// Update MBWay integration
app.put('/api/integrations/mbway/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const { id } = req.params
    const { mbway_key, is_active } = req.body

    if (!mbway_key) {
      return res.status(400).json({ error: 'MBWay key is required' })
    }

    // Encrypt the mbway_key before storing in database
    const encryptedKey = encrypt(mbway_key)

    const result = await sql`
      UPDATE mbway_integrations 
      SET mbway_key = ${encryptedKey}, is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid
      RETURNING id, mbway_key, is_active, created_at, updated_at
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'MBWay integration not found' })
    }

    // Decrypt the key before sending response
    const integration = result[0]
    if (integration.mbway_key) {
      integration.mbway_key = decrypt(integration.mbway_key)
    }

    res.json(integration)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar integração MBWay.' })
  }
}) as any)

// Delete MBWay integration
app.delete('/api/integrations/mbway/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const { id } = req.params

    const result = await sql`
      DELETE FROM mbway_integrations 
      WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid
      RETURNING id
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'MBWay integration not found' })
    }

    res.status(200).json({ message: 'MBWay integration deleted successfully' })
  } catch {
    res.status(500).json({ error: 'Erro ao deletar integração MBWay.' })
  }
}) as any)

// Test MBWay connection
app.post('/api/integrations/mbway/test', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    // Get the MBWay key for this team
    const integrationResult = await sql`
      SELECT mbway_key FROM mbway_integrations 
      WHERE team_id = ${teamId}::uuid AND is_active = true
    `

    if (integrationResult.length === 0) {
      return res.status(400).json({ error: 'No active MBWay integration found' })
    }

    // Decrypt the mbway_key before using it
    let mbwayKey: string
    try {
      mbwayKey = decrypt(integrationResult[0].mbway_key)
    } catch (error) {
      console.error('Error decrypting mbway_key for test:', error)
      return res.status(500).json({ success: false, error: 'Error decrypting integration key' })
    }

    // Test the connection by making a minimal request to IfthenPay
    const testResponse = await fetch('https://api.ifthenpay.com/spg/payment/mbway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mbWayKey: mbwayKey,
        orderId: 'TEST' + Date.now(),
        amount: '0.01',
        mobileNumber: '351#999999999',
        description: 'Test connection',
      }),
    })

    const responseText = await testResponse.text()
    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      return res.status(200).json({ success: false, error: 'Invalid response from IfthenPay' })
    }

    // Check if the response indicates a valid key (even if it's a test payment)
    const success = testResponse.ok && result.Success !== false

    return res.status(200).json({ success })
  } catch (error) {
    console.error('Error testing MBWay connection:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}) as any)

// Stripe endpoints for subscription billing
// Create checkout session for premium subscription
app.post('/api/billing/create-checkout-session', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    // Get team information
    const teamResult = await sql`
      SELECT name, tier FROM teams WHERE id = ${teamId}::uuid
    `
    
    if (teamResult.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const team = teamResult[0]
    
    // Check if team is already premium
    if (team.tier === 'premium') {
      return res.status(400).json({ error: 'Team is already on premium plan' })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Plano Premium - Camp Management',
              description: 'Acesso completo a todas as funcionalidades premium',
            },
            unit_amount: 1900, // €19.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}/settings/billing?canceled=true`,
      metadata: {
        team_id: teamId,
        team_name: team.name,
      },
      customer_email: req.body.email || undefined,
    })

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Stripe webhook endpoint
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.metadata?.team_id) {
          const teamId = session.metadata.team_id
          
          // Update team tier to premium
          await sql`
            UPDATE teams 
            SET tier = 'premium', updated_at = NOW()
            WHERE id = ${teamId}::uuid
          `
          
          console.log(`Team ${teamId} upgraded to premium plan`)
        }
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Find team by subscription metadata or customer
        if (subscription.metadata?.team_id) {
          const teamId = subscription.metadata.team_id
          
          // Downgrade team to free
          await sql`
            UPDATE teams 
            SET tier = 'free', updated_at = NOW()
            WHERE id = ${teamId}::uuid
          `
          
          console.log(`Team ${teamId} downgraded to free plan`)
        }
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription && typeof invoice.subscription === 'string' && invoice.metadata?.team_id) {
          const teamId = invoice.metadata.team_id
          
          // Optionally downgrade team or send notification
          console.log(`Payment failed for team ${teamId}`)
          
          // You could implement logic here to:
          // 1. Send email notification
          // 2. Set a grace period
          // 3. Downgrade after multiple failures
        }
        break
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}) as any)

// Get subscription status for a team
app.get('/api/billing/subscription-status', (async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req)
    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    const teamResult = await sql`
      SELECT tier, updated_at FROM teams WHERE id = ${teamId}::uuid
    `
    
    if (teamResult.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const team = teamResult[0]
    
    return res.status(200).json({
      tier: team.tier,
      isPremium: team.tier === 'premium',
      lastUpdated: team.updated_at
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  
});