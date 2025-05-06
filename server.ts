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

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY)

// Sign in route
app.post('/api/auth/sign-in', (async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const userResult = await sql`
      SELECT id, email, name, password_hash, team_id 
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
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password_hash;

    return res.status(200).json({
      user: userWithoutPassword,
      session: {
        user: userWithoutPassword,
        token: user.id // Using user ID as token for now
      }
    })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Sign up route
app.post('/api/auth/sign-up', (async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

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
      INSERT INTO public.users (id, email, name, password_hash)
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword})
      RETURNING id, email, name, team_id
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
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
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
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Find user by token (which is the user ID)
    const userResult = await sql`
      SELECT id, email, name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `

    const user = userResult[0]

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id,
      role: user.role
    })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
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
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
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

// Get organization settings
app.get('/api/settings/organization', (async (req: Request, res: Response) => {
  try {
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const userResult = await sql`
      SELECT team_id
      FROM users
      WHERE id = ${token}::uuid
    `;
    
    if (userResult.length === 0 || !userResult[0].team_id) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const teamId = userResult[0].team_id;
    
    const result = await sql`
      SELECT *
      FROM teams
      WHERE id = ${teamId}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting organization settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}) as any)

// Get profile settings
app.get('/api/settings/profile', (async (req: Request, res: Response) => {
  try {
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const result = await sql`
      SELECT id, email, name, role, team_id, created_at, updated_at
      FROM users
      WHERE id = ${token}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting profile settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}) as any)

// ===== DASHBOARD ENDPOINTS =====

// Helper para obter o teamId do header (produção)
function getTeamId(req: Request) {
  // Log all headers for debugging
  console.log('All headers:', req.headers);
  
  // Check for x-team-id header (primary)
  const teamIdHeader = req.headers['x-team-id'];
  if (teamIdHeader && typeof teamIdHeader === 'string') {
    console.log('Found teamId in x-team-id header:', teamIdHeader);
    return teamIdHeader;
  }
  
  // Check for authorization header as fallback
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('Using token from authorization header:', token);
    // Here we could potentially look up the user's team_id using the token
    // but for now we'll return null as we need the explicit x-team-id header
  }
  
  // Check if the team ID is in X-Debug-Info header (for debugging)
  const debugHeader = req.headers['x-debug-info'];
  if (debugHeader && typeof debugHeader === 'string' && debugHeader.includes('teamId=')) {
    const teamId = debugHeader.split('teamId=')[1].split('&')[0];
    console.log('Found teamId in X-Debug-Info header:', teamId);
    return teamId;
  }
  
  console.log('No teamId found in headers');
  return null;
}

app.get('/api/dashboard/monthly-payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    // Pagamentos do mês atual
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM payment_date) = ${currentYear}
      AND EXTRACT(MONTH FROM payment_date) = ${currentMonth}
      AND c.team_id = ${teamId}
    `;
    // Pagamentos do mês anterior
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previous = await sql`
      SELECT COALESCE(SUM(amount), 0) as previous_month_total
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM payment_date) = ${prevYear}
      AND EXTRACT(MONTH FROM payment_date) = ${prevMonth}
      AND c.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_amount) || 0;
    const previousTotal = Number(previous[0]?.previous_month_total) || 0;
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
    const currentMonth = now.getMonth() + 1;
    // Inscrições do mês atual
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth}
      AND c.team_id = ${teamId}
    `;
    // Inscrições do mês anterior
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previous = await sql`
      SELECT COUNT(*) as previous_month_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE EXTRACT(YEAR FROM r.created_at) = ${prevYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${prevMonth}
      AND c.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_count) || 0;
    const previousTotal = Number(previous[0]?.previous_month_count) || 0;
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
    const currentMonth = now.getMonth() + 1;
    // Carregamentos do mês atual
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth}
      AND camp.team_id = ${teamId}
    `;
    // Carregamentos do mês anterior
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previous = await sql`
      SELECT COALESCE(SUM(amount), 0) as previous_month_total
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE EXTRACT(YEAR FROM sb.created_at) = ${prevYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${prevMonth}
      AND camp.team_id = ${teamId}
    `;
    const total = Number(current[0]?.total_amount) || 0;
    const previousTotal = Number(previous[0]?.previous_month_total) || 0;
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
        COALESCE(SUM(p.amount), 0) as total_paid
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
    const registrations = await sql`
      SELECT r.*, c.name as camp_name, COALESCE(SUM(p.amount), 0) as total_paid
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}
      GROUP BY r.id, c.name
      ORDER BY r.created_at DESC
    `;
    res.json(registrations);
  } catch {
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
  try {
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Log the request for debugging
    console.log('POST /api/camps request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const teamId = getTeamId(req);
    console.log('TeamId from request:', teamId);
    
    if (!teamId) {
      return res.status(401).json({ error: 'Missing x-team-id header' });
    }
    
    const { name, start_date, end_date, price } = req.body;
    if (!name || !start_date || !end_date || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields', received: { name, start_date, end_date, price } });
    }
    
    const now = new Date().toISOString();
    console.log('Inserting camp with teamId:', teamId);
    
    const result = await sql`
      INSERT INTO camps (name, start_date, end_date, price, team_id, created_at, updated_at)
      VALUES (${name}, ${start_date}, ${end_date}, ${price}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    
    console.log('Camp created successfully:', result[0]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating camp:', error);
    res.status(500).json({ 
      error: 'Erro ao criar acampamento.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push(sql`name = ${name}`); }
    if (start_date !== undefined) { fields.push(sql`start_date = ${start_date}`); }
    if (end_date !== undefined) { fields.push(sql`end_date = ${end_date}`); }
    if (price !== undefined) { fields.push(sql`price = ${price}`); }
    fields.push(sql`updated_at = ${now}`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = sql.join(fields, sql`, `);
    const result = await sql.unsafe(
      `UPDATE camps SET ${setClause.sql} WHERE id = $1 AND team_id = $2 RETURNING *`,
      [id, teamId, ...setClause.values]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch {
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

// List all campers for the current team
app.get('/api/campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const campers = await sql`
      SELECT ca.*, 
             c.name as camp_name, 
             COALESCE(ca.snack_bar_balance, 0) as snack_bar_balance
      FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}
      ORDER BY ca.created_at DESC
    `;
    
    // Mapear os resultados para incluir camp como objeto e garantir que snack_bar_balance seja um número
    const campersWithCampObject = campers.map(camper => ({
      ...camper,
      camp: { name: camper.camp_name },
      snack_bar_balance: Number(camper.snack_bar_balance) || 0
    }));
    
    res.json(campersWithCampObject);
  } catch {
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
    if (!name || !email || !contact || !registration_id) {
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
    
    // Para depuração
    console.log('Update query:', `UPDATE campers SET ${setClause.sql} WHERE id = $1 AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = $2) RETURNING *`);
    console.log('Update params:', [id, teamId, ...setClause.values]);
    
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
    const { name, firstName, lastName, email, role } = req.body;
    const fullName = name || ((firstName && lastName) ? `${firstName} ${lastName}` : null);
    if (!fullName || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO users (name, email, role, team_id, created_at, updated_at)
      VALUES (${fullName}, ${email}, ${role}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}) as any);

// Update a user
app.put('/api/users/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const now = new Date().toISOString();
    const fields = [];
    if (name !== undefined) fields.push(sql`name = ${name}`);
    if (email !== undefined) fields.push(sql`email = ${email}`);
    if (role !== undefined) fields.push(sql`role = ${role}`);
    fields.push(sql`updated_at = ${now}`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = sql.join(fields, sql`, `);
    const result = await sql.unsafe(
      `UPDATE users SET ${setClause.sql} WHERE id = $1 AND team_id = $2 RETURNING *`,
      [id, teamId, ...setClause.values]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}) as any);

// Delete a user
app.delete('/api/users/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sql`
      DELETE FROM users WHERE id = ${id} AND team_id = ${teamId} RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
}) as any);

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
      guardian_name, guardian_email, guardian_phone
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
        guardian_name, guardian_email, guardian_phone, created_at, updated_at
      )
      VALUES (
        ${camp_id}, ${name}, ${email}, ${contact}, ${status || 'unpaid'}, ${onboarding_status || 'Pendente'}, ${form_id},
        ${id_number}, ${sns_number}, ${date_of_birth}, ${dietary_restrictions},
        ${guardian_name}, ${guardian_email}, ${guardian_phone}, ${now}, ${now}
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
      guardian_name, guardian_email, guardian_phone
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

// Helper to update registration status after payment changes
async function updateRegistrationStatus(registrationId: string) {
  // Get total paid amount
  const totalPaid = await sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE registration_id = ${registrationId}
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
  // Update registration status
  await sql`
    UPDATE registrations SET status = ${newStatus} WHERE id = ${registrationId}
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
    const payments = await sql`
      SELECT p.* FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE p.registration_id = ${registrationId} AND c.team_id = ${teamId}
      ORDER BY p.created_at DESC
    `;
    res.json(payments);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
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
    const paymentStatus = payment_method === 'MB Way' ? 'pending' : 'confirmed';
    const result = await sql`
      INSERT INTO payments (
        registration_id, payment_method, amount, payment_date, phone_number, payment_link, payment_status, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${payment_method}, ${amount}, ${payment_date}, ${phone_number}, ${payment_link}, ${paymentStatus}, ${now}, ${now}
      ) RETURNING *
    `;
    await updateRegistrationStatus(registration_id);
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar pagamento.' });
  }
}) as any);

// Update a payment
app.put('/api/payments/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { registration_id, ...fields } = req.body;
    const now = new Date().toISOString();
    const setFields = Object.entries(fields).map(([key, value]) => `${key} = '${value}'`).join(', ');
    const result = await sql.unsafe(
      `UPDATE payments SET ${setFields}, updated_at = '${now}' WHERE id = $1 AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = $2) RETURNING *`,
      [id, teamId]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'Payment not found or you do not have permission to update it' });
    }
    if (registration_id) {
      await updateRegistrationStatus(registration_id);
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
  }
}) as any);

// Delete a payment
app.delete('/api/payments/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Get registration_id before deleting
    const payment = await sql`
      SELECT registration_id FROM payments WHERE id = ${id}
    `;
    const result = await sql`
      DELETE FROM payments WHERE id = ${id} AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Payment not found or you do not have permission to delete it' });
    }
    if (payment[0]) {
      await updateRegistrationStatus(payment[0].registration_id);
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar pagamento.' });
  }
}) as any);

// Get latest payment link for a registration
app.get('/api/payments/latest-link', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  const { registrationId } = req.query;
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  if (!registrationId) {
    return res.status(400).json({ error: 'Missing registrationId' });
  }
  try {
    const data = await sql`
      SELECT payment_link FROM payments WHERE registration_id = ${registrationId} AND payment_link IS NOT NULL ORDER BY created_at DESC LIMIT 1
    `;
    res.json({ payment_link: data[0]?.payment_link || null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar link de pagamento.' });
  }
}) as any);

app.patch('/api/registrations/:id/onboarding-status', async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { onboarding_status, status } = req.body;
    const newStatus = onboarding_status || status;
    if (!newStatus) {
      return res.status(400).json({ error: 'Missing onboarding_status' });
    }
    const now = new Date().toISOString();
    const result = await sql`
      UPDATE registrations
      SET onboarding_status = ${newStatus}, updated_at = ${now}
      WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId})
      RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar onboarding_status.' });
  }
});

// API para carregar cartão snackbar
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
    
    // Verificar se a inscrição pertence a um acampamento da equipe
    const reg = await sql`
      SELECT r.id, c.id as camp_id, r.camp_id
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    
    // Buscar o camper relacionado a esta inscrição
    const camperResult = await sql`
      SELECT id FROM campers WHERE registration_id = ${registration_id}
    `;
    
    if (!camperResult[0]) {
      return res.status(404).json({ error: 'Camper not found for this registration' });
    }
    
    const camperId = camperResult[0].id;
    const now = new Date().toISOString();
    
    // Criar o registro no snackbar_balance
    const result = await sql`
      INSERT INTO snackbar_balance (
        registration_id, amount, payment_method, phone_number, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${amount}, ${payment_method}, ${phone_number}, ${now}, ${now}
      ) RETURNING *
    `;
    
    // Atualizar o saldo do campista
    await sql`
      UPDATE campers 
      SET snack_bar_balance = COALESCE(snack_bar_balance, 0) + ${amount}, 
          updated_at = ${now}
      WHERE id = ${camperId}
    `;
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Erro ao processar carregamento:', error);
    res.status(500).json({ error: 'Erro ao processar carregamento do cartão.' });
  }
}) as any);

const PORT = 3001
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.info(`Server running on http://localhost:${PORT}`)
}) 