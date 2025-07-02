import express, { Request, Response, RequestHandler, Application } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

// Load environment variables
dotenv.config()

// Custom type for our route handlers
type AsyncRequestHandler = (req: Request, res: Response) => Promise<Response>

const app: Application = express()

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://campmanagement-pwsm6m1g4-souzaallanxzs-projects.vercel.app', 'https://campmanagement.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}))

// Parse JSON request bodies
app.use(express.json())

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
    console.error('Error in sign-in:', error)
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
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword}, 'contributor')
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
    console.error('Error in sign-up:', error);
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
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Check if Resend API key is configured
    if (!process.env.VITE_RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' })
    }

    // Send email
    const result = await resend.emails.send({
      from: 'Campy <noreply@infolio.pt>',
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
    console.error('Error in get current user:', error)
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
      user: {
        id: user.id,
        email: user.email,
        name: fullName || null,
        team_id: user.team_id,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error in get current user profile:', error)
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
    const { name, language, theme } = req.body

    // Find user by token (which is the user ID)
    const userResult = await sql`
      SELECT id, first_name, last_name
      FROM public.users
      WHERE id = ${token}::uuid
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Update user profile
    // For now, we'll update the first_name field with the full name
    // In the future, you might want to add separate fields for language and theme preferences
    const updateResult = await sql`
      UPDATE public.users
      SET first_name = ${name}, updated_at = NOW()
      WHERE id = ${token}::uuid
      RETURNING id, email, first_name, last_name, team_id, role
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
        name: fullName || null,
        team_id: updatedUser.team_id,
        role: updatedUser.role
      }
    })
  } catch (error) {
    console.error('Error in update current user profile:', error)
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
    console.error('Error creating team:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    const camps = await sql`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COUNT(DISTINCT p.id) as total_payments,
        COUNT(DISTINCT r.id) as total_registrations
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
    `;
    const result = camps.map(camp => ({
      campId: camp.camp_id,
      campName: camp.camp_name,
      totalPayments: Number(camp.total_payments) || 0,
      totalRegistrations: Number(camp.total_registrations) || 0
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar pagamentos por acampamento.' });
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
      LEFT JOIN payments p ON r.id = p.registration_id
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
      LEFT JOIN payments p ON r.id = p.registration_id
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
    console.error('Error fetching registrations:', error);
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
    console.error('Error updating camp:', error);
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
    console.error('Error fetching current camp:', error);
    res.status(500).json({ error: 'Erro ao buscar acampamento atual.' });
  }
}) as any);

// List all campers for the current team
app.get('/api/campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camp_id } = req.query;
    let campers;
    if (camp_id) {
      campers = await sql`
        SELECT ca.*, 
               c.name as camp_name
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId} AND c.id = ${camp_id}
        ORDER BY ca.created_at DESC
      `;
    } else {
      campers = await sql`
        SELECT ca.*, 
               c.name as camp_name
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}
        ORDER BY ca.created_at DESC
      `;
    }

    // For each camper, calculate the correct snack_bar_balance
    const camperBalances = await Promise.all(campers.map(async camper => {
      // Get total deposit for this registration
      const depositResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_deposit
        FROM snackbar_balance
        WHERE registration_id = ${camper.registration_id}
      `;
      // Get total spent for this camper
      const spentResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM snack_bar_transactions
        WHERE camper_id = ${camper.id}
      `;
      const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
      const totalSpent = Number(spentResult[0]?.total_spent || 0);
      const snack_bar_balance = totalDeposit - totalSpent;
      return {
        ...camper,
        camp: { name: camper.camp_name },
        snack_bar_balance
      };
    }));
    res.json(camperBalances);
  } catch (error) {
    console.error('Error fetching campers:', error);
    res.status(500).json({ error: 'Erro ao buscar campistas.' });
  }
}) as any);

// Get a single camper by ID
app.get('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const camper = await sql`
      SELECT ca.*
      FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    if (!camper[0]) {
      return res.status(404).json({ error: 'Camper not found' });
    }
    res.json(camper[0]);
  } catch {
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
    if (!name || !email || !contact) {
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
      VALUES (${name}, ${email}, ${contact}, ${registration_id}, ${form_id}, ${camp}, ${additional_notes}, ${now}, ${now})
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
    console.error('Error updating camper:', error);
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
      from: 'Campy <noreply@infolio.pt>',
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
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}) as any);

// GET user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = req.headers['x-team-id'];
  if (!teamId || typeof teamId !== 'string') {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`SELECT * FROM users WHERE id = ${id} AND team_id = ${teamId}`;
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
  const teamId = req.headers['x-team-id'];
  if (!teamId || typeof teamId !== 'string') {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role } = req.body;
    const now = new Date().toISOString();
    const fields = [];
    if (firstName !== undefined) fields.push(`first_name = '${firstName}'`);
    if (lastName !== undefined) fields.push(`last_name = '${lastName}'`);
    if (email !== undefined) fields.push(`email = '${email}'`);
    if (role !== undefined) fields.push(`role = '${role}'`);
    fields.push(`updated_at = '${now}'`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = fields.join(', ');
    const result = await sql.unsafe(
      `UPDATE users SET ${setClause} WHERE id = $1 AND team_id = $2 RETURNING *`,
      [id, teamId]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// DELETE user by ID
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = req.headers['x-team-id'];
  if (!teamId || typeof teamId !== 'string') {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`DELETE FROM users WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
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
  
  // Debug logs
  console.log('=== ONBOARDING STATUS DEBUG ===');
  console.log('Headers received:', req.headers);
  console.log('Team ID from getTeamId:', teamId);
  console.log('x-team-id header:', req.headers['x-team-id']);
  console.log('Authorization header:', req.headers['authorization']);
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('==============================');
  
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('Onboarding status update request:', { id, status, teamId });
    
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
    
    console.log('Registration check result:', registrationCheck);
    
    if (registrationCheck.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // Compare team_id as strings
    const registrationTeamId = registrationCheck[0].team_id;
    console.log('Team ID comparison:', { registrationTeamId, teamId, match: registrationTeamId === teamId });
    
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
    
    console.log('Update result:', result);
    
    if (!result[0]) {
      return res.status(404).json({ error: 'Failed to update registration' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating registration onboarding status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status de onboarding.' });
  }
}) as any);

// Helper to update registration status after payment changes
async function updateRegistrationStatus(registrationId: string) {
  // Get total paid amount - only confirmed payments (exclude pending)
  const totalPaid = await sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE registration_id = ${registrationId} AND payment_status = 'confirmed'
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
    console.error('Error fetching payments:', error);
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
    const { registration_id, payment_method, amount, payment_date, phone_number, payment_link } = req.body;
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
        registration_id, payment_method, amount, payment_date, phone_number, payment_link, payment_status, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${payment_method}, ${amount}, ${payment_date}, ${phone_number}, ${payment_link}, ${paymentStatus}, ${now}, ${now}
      ) RETURNING *
    `;
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
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
    const { registration_id, amount, payment_method, phone_number } = req.body;
    
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
    
    const result = await sql`
      INSERT INTO snackbar_balance (
        registration_id, amount, payment_method, phone_number, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${amount}, ${payment_method}, ${phone_number}, ${now}, ${now}
      ) RETURNING *
    `;
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating snackbar balance entry:', error);
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
    
    // Get total deposit for this camper's registration
    const depositResult = await sql`
      SELECT COALESCE(SUM(sb.amount), 0) as total_deposit
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      JOIN campers ca ON r.id = ca.registration_id
      WHERE ca.id = ${camperId}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    // Get total spent for this camper
    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}::uuid
    `;
    
    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const balance = totalDeposit - totalSpent;
    
    res.json({
      balance,
      total_deposit: totalDeposit,
      total_spent: totalSpent
    });
  } catch (error) {
    console.error('Error fetching snackbar balance:', error);
    res.status(500).json({ error: 'Error fetching snackbar balance' });
  }
}) as any);

// Create a new snackbar transaction
app.post('/api/snackbar-transactions', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { camper_id, amount } = req.body;
    
    if (!camper_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if camper belongs to the team
    const camperCheck = await sql`
      SELECT ca.id FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${camper_id}::uuid AND c.team_id = ${teamId}::uuid
    `;
    
    if (!camperCheck[0]) {
      return res.status(400).json({ error: 'Camper does not belong to your team' });
    }
    
    const now = new Date().toISOString();
    
    const result = await sql`
      INSERT INTO snack_bar_transactions (
        camper_id, amount, created_at
      ) VALUES (
        ${camper_id}::uuid, ${amount}, ${now}
      ) RETURNING *
    `;
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating snackbar transaction:', error);
    res.status(500).json({ error: 'Error creating snackbar transaction' });
  }
}) as any);

// Get transactions for a specific camper
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
      SELECT * FROM snack_bar_transactions
      WHERE camper_id = ${camperId}::uuid
      ORDER BY created_at DESC
    `;
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching snackbar transactions:', error);
    res.status(500).json({ error: 'Error fetching snackbar transactions' });
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
    
    const transactions = await sql`
      SELECT 
        sbt.id,
        sbt.camper_id,
        sbt.amount,
        sbt.created_at,
        ca.name as camper_name
      FROM snack_bar_transactions sbt
      JOIN campers ca ON sbt.camper_id = ca.id
      JOIN registrations r ON ca.registration_id = r.id
      WHERE r.camp_id = ${camp_id}::uuid
      ORDER BY sbt.created_at DESC
    `;
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching snackbar transactions:', error);
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
  const baseUrl = 'https://camp-management-1.onrender.com'
  const webhookUrl = `${baseUrl}/api/webhooks/${type}/${teamId}`

  console.log(`Creating Hookdeck connection for ${type}, team ${teamId}`)
  console.log(`Destination URL: ${webhookUrl}`)

  // Verificar se a URL é válida
  try {
    const urlTest = new URL(webhookUrl)
    console.log('URL validation passed:', urlTest.toString())
  } catch (error) {
    console.error('Invalid URL:', webhookUrl, error)
    throw new Error(`Invalid webhook URL: ${webhookUrl}`)
  }

  // 1. Criar Destination
  const timestamp = Date.now()
  const sanitizedName = `webhook-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const destinationPayload = {
    name: sanitizedName,
    config: {
      url: webhookUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
  
  console.log('Creating destination with payload:', destinationPayload)
  
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
    console.error('Destination creation failed:', {
      status: destinationResponse.status,
      statusText: destinationResponse.statusText,
      error: errorText
    })
    throw new Error(`Failed to create destination: ${destinationResponse.statusText} - ${errorText}`)
  }

  const destination = await destinationResponse.json()
  console.log('Destination created successfully:', destination)

  // 2. Criar Source
  const sourceUrl = `https://hkdk.events/${Math.random().toString(36).slice(2, 10)}`
  const sourceSanitizedName = `source-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const sourcePayload = {
    name: sourceSanitizedName,
    url: sourceUrl,
    config: {
      custom_response: {
        status: 200,
        content_type: 'application/json', // Obrigatório para o Hookdeck
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'SUCCESS',
          message: 'Webhook received and processed successfully',
          request_id: '{{request.id}}'
        })
      }
    }
  }
  
  console.log('Creating source with payload:', sourcePayload)
  
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
    console.error('Source creation failed:', {
      status: sourceResponse.status,
      statusText: sourceResponse.statusText,
      error: errorText
    })
    throw new Error(`Failed to create source: ${sourceResponse.statusText} - ${errorText}`)
  }

  const source = await sourceResponse.json()
  console.log('Source created successfully:', source)

  // 3. Criar Connection
  const connectionSanitizedName = `connection-${type}-team-${teamId}-${timestamp}`.replace(/[^A-z0-9-_]/g, '-')
  const connectionPayload = {
    name: connectionSanitizedName,
    source_id: source.id,
    destination_id: destination.id
  }
  
  console.log('Creating connection with payload:', connectionPayload)
  
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
    console.error('Connection creation failed:', {
      status: connectionResponse.status,
      statusText: connectionResponse.statusText,
      error: errorText
    })
    throw new Error(`Failed to create connection: ${connectionResponse.statusText} - ${errorText}`)
  }

  const connection = await connectionResponse.json()
  console.log('Connection created successfully:', connection)

  const result = {
    connection: { id: connection.id },
    source: { id: source.id, url: source.url },
    destination: { id: destination.id },
    webhookUrl: source.url
  }
  
  console.log('Hookdeck connection setup completed:', result)
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
    console.log(`Connection ${connectionId} not found, assuming already deleted`)
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

  console.log(`Starting cleanup of Hookdeck resources:`, { connectionId, sourceId, destinationId })

  const headers = {
    'Authorization': `Bearer ${hookdeckApiKey}`,
    'Content-Type': 'application/json'
  }

  // 1. Deletar connection
  try {
    console.log(`Attempting to delete connection: ${connectionId}`)
    await deleteHookdeckConnection(connectionId)
    console.log(`Successfully deleted connection: ${connectionId}`)
  } catch (error) {
    console.warn(`Failed to delete connection ${connectionId}:`, error)
  }

  // 2. Deletar source se fornecido
  if (sourceId) {
    try {
      console.log(`Attempting to delete source: ${sourceId}`)
      const sourceResponse = await fetch(`https://api.hookdeck.com/2025-01-01/sources/${sourceId}`, {
        method: 'DELETE',
        headers
      })
      
      if (sourceResponse.status === 404) {
        console.log(`Source ${sourceId} not found, assuming already deleted`)
      } else if (sourceResponse.ok) {
        console.log(`Successfully deleted source: ${sourceId}`)
      } else {
        console.warn(`Failed to delete source ${sourceId}: ${sourceResponse.statusText}`)
      }
    } catch (error) {
      console.warn(`Error deleting source ${sourceId}:`, error)
    }
  }

  // 3. Deletar destination se fornecido
  if (destinationId) {
    try {
      console.log(`Attempting to delete destination: ${destinationId}`)
      const destinationResponse = await fetch(`https://api.hookdeck.com/2025-01-01/destinations/${destinationId}`, {
        method: 'DELETE',
        headers
      })
      
      if (destinationResponse.status === 404) {
        console.log(`Destination ${destinationId} not found, assuming already deleted`)
      } else if (destinationResponse.ok) {
        console.log(`Successfully deleted destination: ${destinationId}`)
      } else {
        console.warn(`Failed to delete destination ${destinationId}: ${destinationResponse.statusText}`)
      }
    } catch (error) {
      console.warn(`Error deleting destination ${destinationId}:`, error)
    }
  }

  console.log(`Completed cleanup of Hookdeck resources`)
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
    console.error('Error fetching webhook config:', error)
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
    console.error('Error saving webhook config:', error)
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
    console.error('Error setting up webhook:', error)
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
    console.log('Cleanup request received:', { teamId, connectionId, sourceId, destinationId, webhookType })
    
    if (!connectionId) {
      console.error('Cleanup failed: Connection ID is required')
      return res.status(400).json({ error: 'Connection ID is required' })
    }
    
    // Remover todos os recursos do Hookdeck (connection, source, destination)
    try {
      await deleteHookdeckResources(connectionId, sourceId, destinationId)
      console.log(`Successfully cleaned up all resources for connection: ${connectionId}`)
    } catch (hookdeckError) {
      console.warn(`Hookdeck cleanup failed for connection ${connectionId}:`, hookdeckError)
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
          
          console.log(`Updated database state for team ${teamId}, webhook ${webhookType} disabled`)
        }
      }
    } catch (dbError) {
      console.error('Error updating database state:', dbError)
      // Não falhamos a operação se a atualização do DB falhar
    }
    
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error cleaning up webhook:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Recebe webhooks de inscrições
app.post('/api/webhooks/registrations/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    // Lê o request_id do header enviado pelo Hookdeck
    const request_id = req.headers['x-hookdeck-request-id'] as string | undefined;

    // Debug: Log the incoming request
    console.log('=== REGISTRATION WEBHOOK DEBUG ===');
    console.log('Team ID:', teamId);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Request ID from header:', request_id);
    console.log('==================================');

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

    // Debug: Log the request_id before insertion
    console.log('Request ID to be inserted:', request_id);

    // Criar registration (sem team_id)
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO registrations (
        camp_id, name, email, contact, status, form_id, id_number, sns_number, date_of_birth, dietary_restrictions, guardian_name, guardian_email, guardian_phone, request_id, created_at, updated_at
      ) VALUES (
        ${camp_id || null}, ${name}, ${email}, ${contact}, ${status || 'unpaid'}, ${form_id || null}, ${id_number || null}, ${sns_number || null}, ${date_of_birth || null}, ${dietary_restrictions || null}, ${guardian_name || null}, ${guardian_email || null}, ${guardian_phone || null}, ${request_id || null}, ${now}, ${now}
      ) RETURNING *
    `;

    console.log('Registration created with result:', result[0]);

    return res.status(200).json({
      success: true,
      message: 'Registration created successfully',
      registration: result[0]
    });
  } catch (error) {
    console.error('Error processing registration webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recebe webhooks de pagamentos
app.post('/api/webhooks/payments/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const {
      registration_id,
      email,
      request_id,
      amount,
      status
    } = req.body;

    // Validação dos campos obrigatórios
    const errors: string[] = [];
    if (!amount) errors.push('amount is required');
    if (!registration_id && !email && !request_id) errors.push('registration_id, email, or request_id is required');
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Validar se o teamId é válido
    const teamResult = await sql`SELECT id FROM teams WHERE id = ${teamId}::uuid`;
    if (!teamResult[0]) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Buscar registration
    let registration;
    if (registration_id) {
      const regResult = await sql`
        SELECT r.*, c.price as camp_price FROM registrations r
        LEFT JOIN camps c ON r.camp_id = c.id
        WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
      `;
      registration = regResult[0];
    } else if (request_id) {
      const regResult = await sql`
        SELECT r.*, c.price as camp_price FROM registrations r
        LEFT JOIN camps c ON r.camp_id = c.id
        WHERE r.request_id = ${request_id} AND c.team_id = ${teamId}
        ORDER BY r.created_at DESC LIMIT 1
      `;
      registration = regResult[0];
    } else if (email) {
      const regResult = await sql`
        SELECT r.*, c.price as camp_price FROM registrations r
        LEFT JOIN camps c ON r.camp_id = c.id
        WHERE r.email = ${email} AND c.team_id = ${teamId}
        ORDER BY r.created_at DESC LIMIT 1
      `;
      registration = regResult[0];
    }
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Criar pagamento
    const now = new Date().toISOString();
    await sql`
      INSERT INTO payments (
        registration_id, amount, payment_date, payment_status, created_at, updated_at
      ) VALUES (
        ${registration.id}, ${amount}, ${now}, 'confirmed', ${now}, ${now}
      )
    `;

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

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      registration: {
        id: updatedRegistration.id,
        total_amount_paid: totalPaid,
        status: updatedRegistration.status,
        // ... outros campos se necessário
      },
      payment: {
        amount: Number(amount),
        total_paid: totalPaid,
        status: updatedRegistration.status
      }
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});