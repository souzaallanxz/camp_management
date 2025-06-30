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
        COALESCE(SUM(p.amount), 0) as total_paid
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
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : null;
    if (!firstName || !lastName || !fullName || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const now = new Date().toISOString();
    const result = await sql`
      INSERT INTO users (name, first_name, last_name, email, role, team_id, created_at, updated_at)
      VALUES (${fullName}, ${firstName}, ${lastName}, ${email}, ${role}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
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
    const { name, email, role } = req.body;
    const now = new Date().toISOString();
    const fields = [];
    if (name !== undefined) fields.push(`name = '${name}'`);
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
    
    // Update registration status after deleting payment
    if (payment[0] && payment[0].registration_id) {
      await updateRegistrationStatus(payment[0].registration_id);
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento.' });
  }
}) as any);

// Get camper's snack bar balance (CORRECTED)
app.get('/api/snackbar-balance/:camperId', async (req: Request, res: Response) => {
  try {
    const { camperId } = req.params;
    const teamId = getTeamId(req);

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' });
    }

    // Get camper's registration_id and check team
    const camperResult = await sql`
      SELECT c.registration_id
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps cp ON r.camp_id = cp.id
      WHERE c.id = ${camperId}
      AND cp.team_id = ${teamId}
    `;

    if (camperResult.length === 0) {
      return res.status(404).json({ error: 'Camper not found' });
    }

    const registrationId = camperResult[0].registration_id;

    // Sum all deposits for this registration
    const depositResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}
    `;

    // Sum all debits for this camper
    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}
    `;

    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const currentBalance = totalDeposit - totalSpent;

    return res.json({
      balance: currentBalance,
      total_deposit: totalDeposit,
      total_spent: totalSpent
    });
  } catch (error) {
    console.error('Error getting snack bar balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create snackbar balance entry (add balance)
app.post('/api/snackbar-balance', async (req: Request, res: Response) => {
  try {
    const { registration_id, amount, payment_method, phone_number } = req.body;
    const teamId = getTeamId(req);

    console.log('Snackbar balance request:', { 
      registration_id, 
      amount, 
      payment_method, 
      phone_number,
      teamId 
    });

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' });
    }

    if (!registration_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Registration ID, amount, and payment method are required' });
    }

    // Verify if registration belongs to the team
    const registrationResult = await sql`
      SELECT r.id
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id}
      AND c.team_id = ${teamId}
    `;

    if (registrationResult.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }

    // Create snackbar balance entry
    const result = await sql`
      INSERT INTO snackbar_balance (registration_id, amount, payment_method, phone_number, created_at, updated_at)
      VALUES (${registration_id}, ${amount}, ${payment_method}, ${phone_number}, NOW(), NOW())
      RETURNING id, registration_id, amount, payment_method, phone_number, created_at
    `;

    return res.status(201).json({
      id: result[0].id,
      registration_id: result[0].registration_id,
      amount: Number(result[0].amount),
      payment_method: result[0].payment_method,
      phone_number: result[0].phone_number,
      created_at: result[0].created_at
    });
  } catch (error) {
    console.error('Error creating snackbar balance entry:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get camper's transactions
app.get('/api/snackbar-transactions/:camperId', (async (req: Request, res: Response) => {
  try {
    const { camperId } = req.params
    const teamId = getTeamId(req)

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    // Get camper's transactions
    const result = await sql`
      SELECT t.*
      FROM snack_bar_transactions t
      JOIN campers c ON t.camper_id = c.id
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps cp ON r.camp_id = cp.id
      WHERE c.id = ${camperId}
      AND cp.team_id = ${teamId}
      ORDER BY t.created_at DESC
    `

    return res.status(200).json(result)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Create transaction (deduct balance)
app.post('/api/snackbar-transactions', (async (req: Request, res: Response) => {
  try {
    const { camper_id, amount } = req.body
    const teamId = getTeamId(req)

    // Log request details for debugging
    console.log('Snackbar transaction request:', { 
      camper_id, 
      amount, 
      teamId,
      headers: req.headers
    })

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required in x-team-id header' })
    }

    if (!camper_id || !amount) {
      return res.status(400).json({ error: 'Camper ID and amount are required' })
    }

    // Verify if camper belongs to the team and get registration_id
    const camperResult = await sql`
      SELECT c.id, c.registration_id
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps cp ON r.camp_id = cp.id
      WHERE c.id = ${camper_id}
      AND cp.team_id = ${teamId}
    `

    if (camperResult.length === 0) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' })
    }

    const registrationId = camperResult[0].registration_id

    // Calculate current balance from snackbar_balance and snack_bar_transactions tables
    const depositResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}
    `

    const spentResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camper_id}
    `

    const totalDeposit = Number(depositResult[0]?.total_deposit || 0)
    const totalSpent = Number(spentResult[0]?.total_spent || 0)
    const currentBalance = totalDeposit - totalSpent
    const newBalance = currentBalance - Number(amount)

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Create transaction
    const result = await sql`
      INSERT INTO snack_bar_transactions (camper_id, amount, created_at, updated_at)
      VALUES (${camper_id}, ${amount}, NOW(), NOW())
      RETURNING id, camper_id, amount, created_at
    `

    return res.status(200).json({
      id: result[0].id,
      camper_id: result[0].camper_id,
      amount: Number(result[0].amount),
      created_at: result[0].created_at,
      current_balance: newBalance
    })
  } catch (error) {
    console.error('Error creating snack bar transaction:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}) as any)

// Get all transactions for a camp
app.get('/api/snackbar-transactions', (async (req: Request, res: Response) => {
  try {
    const { camp_id } = req.query
    const teamId = getTeamId(req)

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    if (!camp_id) {
      return res.status(400).json({ error: 'Camp ID is required' })
    }

    // Get all transactions for the camp
    const result = await sql`
      SELECT t.*, c.name as camper_name
      FROM snack_bar_transactions t
      JOIN campers c ON t.camper_id = c.id
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps cp ON r.camp_id = cp.id
      WHERE cp.id = ${camp_id}
      AND cp.team_id = ${teamId}
      ORDER BY t.created_at DESC
    `

    return res.status(200).json(result)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Get current user profile
app.get('/api/auth/profile', (async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const userResult = await sql`
      SELECT id, email, name, team_id, created_at, updated_at
      FROM public.users 
      WHERE id = ${token}::uuid
    `

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult[0]

    // Get team info if user has a team
    let teamInfo = null
    if (user.team_id) {
      const teamResult = await sql`
        SELECT id, name
        FROM public.teams 
        WHERE id = ${user.team_id}::uuid
      `
      if (teamResult.length > 0) {
        teamInfo = teamResult[0]
      }
    }

    return res.status(200).json({
      user,
      team: teamInfo
    })
  } catch (error) {
    console.error('Error getting user profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Update current user profile
app.put('/api/auth/profile', (async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token
    const { name, language } = req.body
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const result = await sql`
      UPDATE public.users 
      SET name = ${name}, 
          updated_at = NOW()
      WHERE id = ${token}::uuid
      RETURNING id, email, name, team_id, created_at, updated_at
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result[0]

    return res.status(200).json({
      user,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

// Check if camp can be deleted (has no registrations)
app.get('/api/camps/:id/can-delete', (async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const teamId = getTeamId(req)

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    // Check if camp belongs to the team
    const campResult = await sql`
      SELECT id, name
      FROM public.camps 
      WHERE id = ${id}::uuid 
      AND team_id = ${teamId}::uuid
    `

    if (campResult.length === 0) {
      return res.status(404).json({ error: 'Camp not found' })
    }

    // Check if camp has any registrations
    const registrationsResult = await sql`
      SELECT COUNT(*) as count
      FROM public.registrations 
      WHERE camp_id = ${id}::uuid
    `

    const hasRegistrations = Number(registrationsResult[0]?.count || 0) > 0

    return res.status(200).json({
      canDelete: !hasRegistrations,
      hasRegistrations,
      registrationCount: Number(registrationsResult[0]?.count || 0)
    })
  } catch (error) {
    console.error('Error checking if camp can be deleted:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) as any)

app.get('/api/registrations/:id', async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  const { id } = req.params;
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const result = await sql`
      SELECT 
        r.*, 
        c.name as camp_name, 
        c.start_date as camp_start_date, 
        c.end_date as camp_end_date, 
        c.price as camp_price
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id} AND c.team_id = ${teamId}
      LIMIT 1
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching registration by id:', error);
    res.status(500).json({ error: 'Erro ao buscar inscrição.' });
  }
});

// Debug endpoint to check registration
app.get('/api/debug/registration/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    
    console.log('Debug registration request:', { id, teamId });
    
    // Check if the registration exists
    const registration = await sql`
      SELECT r.id, r.name, r.camp_id, c.team_id, c.name as camp_name
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id}::uuid
    `;
    
    console.log('Debug registration result:', registration);
    
    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json({
      registration: registration[0],
      teamId,
      registrationTeamId: registration[0].team_id,
      match: registration[0].team_id === teamId
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as any);

// Get current camp for the team
app.get('/api/camps/current', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const today = new Date();
    const todayDateOnly = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('Current camp search:', { teamId, todayDateOnly });
    
    // 1. Try to get current active camp (today is between start_date and end_date)
    const currentCamp = await sql`
      SELECT * FROM camps 
      WHERE team_id = ${teamId} 
        AND start_date::date <= ${todayDateOnly}::date
        AND end_date::date >= ${todayDateOnly}::date
      ORDER BY start_date ASC
      LIMIT 1
    `;
    
    console.log('Current camp result:', currentCamp.length > 0 ? currentCamp[0] : 'No current camp found');
    
    if (currentCamp.length > 0) {
      return res.status(200).json(currentCamp[0]);
    }
    
    // 2. Try to get the next upcoming camp
    const upcomingCamp = await sql`
      SELECT * FROM camps 
      WHERE team_id = ${teamId} 
        AND start_date::date > ${todayDateOnly}::date
      ORDER BY start_date ASC
      LIMIT 1
    `;
    
    console.log('Upcoming camp result:', upcomingCamp.length > 0 ? upcomingCamp[0] : 'No upcoming camp found');
    
    if (upcomingCamp.length > 0) {
      return res.status(200).json(upcomingCamp[0]);
    }
    
    // 3. Try to get the most recently ended camp
    const pastCamp = await sql`
      SELECT * FROM camps 
      WHERE team_id = ${teamId} 
        AND end_date::date < ${todayDateOnly}::date
      ORDER BY end_date DESC
      LIMIT 1
    `;
    
    console.log('Past camp result:', pastCamp.length > 0 ? pastCamp[0] : 'No past camp found');
    
    if (pastCamp.length > 0) {
      return res.status(200).json(pastCamp[0]);
    }
    
    // 4. If all else fails, return the first camp (if any)
    const anyCamp = await sql`
      SELECT * FROM camps 
      WHERE team_id = ${teamId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    console.log('Any camp result:', anyCamp.length > 0 ? anyCamp[0] : 'No camps found');
    
    if (anyCamp.length > 0) {
      return res.status(200).json(anyCamp[0]);
    }
    
    return res.status(404).json({ error: 'No camps found' });
  } catch (error) {
    console.error('Error fetching current camp:', error);
    return res.status(500).json({ error: 'Erro ao buscar acampamento atual.' });
  }
}) as any);

// Start the server
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})