import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

// Load environment variables
dotenv.config()

const app = express()

// Enable CORS
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://campmanagement-pwsm6m1g4-souzaallanxzs-projects.vercel.app',
      'https://campmanagement.vercel.app'
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id', 'Origin', 'Accept'],
  exposedHeaders: ['x-team-id'],
  maxAge: 86400 // 24 hours
}))

// Parse JSON request bodies
app.use(express.json())

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY)

// Sign in route
app.post('/api/auth/sign-in', (async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Log database connection status
    const dbStatus = {
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlLength: process.env.DATABASE_URL?.length || 0
    }

    // Find user by email
    const userResult = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      password_hash: string;
      team_id: string;
    }>`
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
}) as RequestHandler)

// Sign up route
app.post('/api/auth/sign-up', (async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    // Check if user already exists
    const existingUserResult = await query`
      SELECT id FROM public.users WHERE email = ${email}
    `

    if (existingUserResult.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const result = await query`
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
}) as RequestHandler)

// Forgot password route
app.post('/api/auth/forgot-password', (async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    // Check if user exists
    const userResult = await query`
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
    await query`
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
}) as RequestHandler)

// Reset password route
app.post('/api/auth/reset-password', (async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body

    // Find user with valid reset token
    const userResult = await query`
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
    await query`
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
}) as RequestHandler)

// Get current user route
app.get('/api/auth/me', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    // Find user by token (which is the user ID)
    const userResult = await query`
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
}) as RequestHandler)

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
}) as RequestHandler)

// Setup password route
app.post('/api/auth/setup-password', (async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }
    // Verifica se o usuário existe e está como 'invited'
    const userResult = await query`
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
    await query`
      UPDATE public.users
      SET password_hash = ${hashedPassword}, status = 'active', updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erro ao definir senha.' });
  }
}) as RequestHandler)

// === GET CURRENT USER'S TEAM ===
app.get('/api/teams/current', (async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    // Buscar o usuário pelo token (id)
    const userResult = await query`
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
    const teamResult = await query`
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
}) as RequestHandler)

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
    // Get total payments across all time
    const result = await query`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}
    `;
    
    const total = Number(result[0]?.total_amount) || 0;
    res.json({ total, previousTotal: 0, percentageChange: null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
}) as RequestHandler)

app.get('/api/dashboard/monthly-registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Get total registrations across all time
    const result = await query`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}
    `;
    
    const total = Number(result[0]?.total_count) || 0;
    res.json({ total, previousTotal: 0, percentageChange: null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
}) as RequestHandler)

app.get('/api/dashboard/monthly-snackbar', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Get total snackbar balance loads across all time
    const result = await query`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE camp.team_id = ${teamId}
    `;
    
    const total = Number(result[0]?.total_amount) || 0;
    res.json({ total, previousTotal: 0, percentageChange: null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar carregamentos.' });
  }
}) as RequestHandler)

app.get('/api/dashboard/yearly-campers', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    // Get total campers across all time
    const result = await query`
      SELECT COUNT(*) as total_count
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE camp.team_id = ${teamId}
    `;
    
    const total = Number(result[0]?.total_count) || 0;
    res.json({ total, previousTotal: 0, percentageChange: null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar campistas.' });
  }
}) as RequestHandler)

app.get('/api/dashboard/camp-payments', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const camps = await query`
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
}) as RequestHandler)

app.get('/api/dashboard/recent-registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' })
  }
  try {
    const limit = Number(req.query.limit) || 5;
    const regs = await query`
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
}) as RequestHandler)

app.get('/api/registrations', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  
  try {
    // Consulta para buscar registros com seus respectivos acampamentos
    const registrationsQuery = await query`
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
}) as RequestHandler)

app.get('/api/camps', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const camps = await query`
      SELECT * FROM camps WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(camps);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar acampamentos.' });
  }
}) as RequestHandler)

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
    const result = await query`
      INSERT INTO camps (name, start_date, end_date, price, team_id, created_at, updated_at)
      VALUES (${name}, ${start_date}, ${end_date}, ${price}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar acampamento.' });
  }
}) as RequestHandler)

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
    if (name !== undefined) fields.push(query`name = ${name}`);
    if (start_date !== undefined) fields.push(query`start_date = ${start_date}`);
    if (end_date !== undefined) fields.push(query`end_date = ${end_date}`);
    if (price !== undefined) fields.push(query`price = ${price}`);
    fields.push(query`updated_at = ${now}`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = query.join(fields, query`, `);
    const result = await query.unsafe(
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
}) as RequestHandler)

// Delete a camp
app.delete('/api/camps/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Check if there are any registrations for this camp
    const regs = await query`SELECT id FROM registrations WHERE camp_id = ${id} LIMIT 1`;
    if (regs.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.' });
    }
    const result = await query`DELETE FROM camps WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar acampamento.' });
  }
}) as RequestHandler)

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
      campers = await query`
        SELECT ca.*, 
               c.name as camp_name, 
               COALESCE(ca.snack_bar_balance, 0) as snack_bar_balance
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId} AND c.id = ${camp_id}
        ORDER BY ca.created_at DESC
      `;
    } else {
      campers = await query`
        SELECT ca.*, 
               c.name as camp_name, 
               COALESCE(ca.snack_bar_balance, 0) as snack_bar_balance
        FROM campers ca
        JOIN registrations r ON ca.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}
        ORDER BY ca.created_at DESC
      `;
    }
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
}) as RequestHandler)

// Get a single camper by ID
app.get('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const camper = await query`
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
}) as RequestHandler)

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
    const reg = await query`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    const now = new Date().toISOString();
    const result = await query`
      INSERT INTO campers (name, email, contact, registration_id, form_id, camp, additional_notes, created_at, updated_at)
      VALUES (${name}, ${email}, ${contact}, ${registration_id}, ${form_id}, ${camp}, ${additional_notes}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar campista.' });
  }
}) as RequestHandler)

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
    if (name !== undefined) fields.push(query`name = ${name}`);
    if (email !== undefined) fields.push(query`email = ${email}`);
    if (contact !== undefined) fields.push(query`contact = ${contact}`);
    if (form_id !== undefined) fields.push(query`form_id = ${form_id}`);
    if (camp !== undefined) fields.push(query`camp = ${camp}`);
    if (additional_notes !== undefined) fields.push(query`additional_notes = ${additional_notes}`);
    if (id_number !== undefined) fields.push(query`id_number = ${id_number}`);
    if (sns_number !== undefined) fields.push(query`sns_number = ${sns_number}`);
    if (date_of_birth !== undefined) fields.push(query`date_of_birth = ${date_of_birth}`);
    if (dietary_restrictions !== undefined) fields.push(query`dietary_restrictions = ${dietary_restrictions}`);
    if (guardian_name !== undefined) fields.push(query`guardian_name = ${guardian_name}`);
    if (guardian_email !== undefined) fields.push(query`guardian_email = ${guardian_email}`);
    if (guardian_phone !== undefined) fields.push(query`guardian_phone = ${guardian_phone}`);
    fields.push(query`updated_at = ${now}`);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const setClause = query.join(fields, query`, `);
    
    const result = await query.unsafe(
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
}) as RequestHandler)

// Delete a camper
app.delete('/api/campers/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await query`
      DELETE FROM campers WHERE id = ${id} AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camper not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar campista.' });
  }
}) as RequestHandler)

// List all users for the current team
app.get('/api/users', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const users = await query`
      SELECT * FROM users WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}) as RequestHandler)

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
    const result = await query`
      INSERT INTO users (name, email, role, team_id, created_at, updated_at)
      VALUES (${fullName}, ${email}, ${role}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}) as RequestHandler)

// GET user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  const teamId = req.headers['x-team-id'];
  if (!teamId || typeof teamId !== 'string') {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await query`SELECT * FROM users WHERE id = ${id} AND team_id = ${teamId}`;
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
    const result = await query.unsafe(
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
    const result = await query`DELETE FROM users WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
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
    const camp = await query`SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}`;
    if (!camp[0]) {
      return res.status(400).json({ error: 'Camp does not belong to your team' });
    }

    const now = new Date().toISOString();
    const result = await query`
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
}) as RequestHandler)

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
    if (camp_id !== undefined) fields.push(query`camp_id = ${camp_id}`);
    if (name !== undefined) fields.push(query`name = ${name}`);
    if (email !== undefined) fields.push(query`email = ${email}`);
    if (contact !== undefined) fields.push(query`contact = ${contact}`);
    if (status !== undefined) fields.push(query`status = ${status}`);
    if (onboarding_status !== undefined) fields.push(query`onboarding_status = ${onboarding_status}`);
    if (form_id !== undefined) fields.push(query`form_id = ${form_id}`);
    if (id_number !== undefined) fields.push(query`id_number = ${id_number}`);
    if (sns_number !== undefined) fields.push(query`sns_number = ${sns_number}`);
    if (date_of_birth !== undefined) fields.push(query`date_of_birth = ${date_of_birth}`);
    if (dietary_restrictions !== undefined) fields.push(query`dietary_restrictions = ${dietary_restrictions}`);
    if (guardian_name !== undefined) fields.push(query`guardian_name = ${guardian_name}`);
    if (guardian_email !== undefined) fields.push(query`guardian_email = ${guardian_email}`);
    if (guardian_phone !== undefined) fields.push(query`guardian_phone = ${guardian_phone}`);
    fields.push(query`updated_at = ${now}`);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = query.join(fields, query`, `);
    // Only update if registration belongs to a camp of the team
    const result = await query.unsafe(
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
}) as RequestHandler)

// Delete a registration
app.delete('/api/registrations/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Only delete if registration belongs to a camp of the team
    const result = await query`
      DELETE FROM registrations WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar inscrição.' });
  }
}) as RequestHandler)

// Helper to update registration status after payment changes
async function updateRegistrationStatus(registrationId: string) {
  // Get total paid amount
  const totalPaid = await query`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE registration_id = ${registrationId}
  `;
  // Get the registration with its camp
  const registration = await query`
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
  await query`
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
    const registration = await query`
      SELECT r.id 
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registrationId}::uuid
      AND c.team_id = ${teamId}::uuid
    `;
    
    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }
    
    const payments = await query`
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
}) as RequestHandler)

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
    const reg = await query`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    const now = new Date().toISOString();
    const paymentStatus = payment_method === 'MB Way' ? 'pending' : 'confirmed';
    const result = await query`
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
}) as RequestHandler)

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
    const result = await query.unsafe(
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
}) as RequestHandler)

// Delete a payment
app.delete('/api/payments/:id', (async (req: Request, res: Response) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Get registration_id before deleting
    const payment = await query`
      SELECT registration_id FROM payments WHERE id = ${id}
    `;
    const result = await query`
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
}) as RequestHandler)

// Get camper's snack bar balance (CORRECTED)
app.get('/api/snackbar-balance/:camperId', async (req: Request, res: Response) => {
  try {
    const { camperId } = req.params;
    const teamId = getTeamId(req);

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' });
    }

    // Get camper's registration_id and check team
    const camperResult = await query`
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
    const depositResult = await query`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}
    `;

    // Sum all debits for this camper
    const spentResult = await query`
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

// Get camper's transactions
app.get('/api/snackbar-transactions/:camperId', (async (req: Request, res: Response) => {
  try {
    const { camperId } = req.params
    const teamId = getTeamId(req)

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID is required' })
    }

    // Get camper's transactions
    const result = await query`
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
}) as RequestHandler)

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
    const camperResult = await query`
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
    const depositResult = await query`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}
    `

    const spentResult = await query`
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
    const result = await query`
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
}) as RequestHandler)

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
    const result = await query`
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
}) as RequestHandler)

// === WEBHOOK ROUTES === //

// Helper function to validate webhook payload for registrations
function validateRegistrationPayload(payload: any) {
  const errors: string[] = []
  if (!payload.name) errors.push('name is required')
  if (!payload.email) errors.push('email is required')
  if (!payload.contact) errors.push('contact is required')
  return errors
}

// Helper function to map webhook payload to registration fields
function mapRegistrationPayload(payload: any, userId: string) {
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
async function makeHookdeckRequest(endpoint: string, method: string = 'GET', body: any = null) {
  const url = `https://api.hookdeck.com/2025-01-01${endpoint}`
  const options: any = {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.HOOKDECK_API_KEY}`,
      'Content-Type': 'application/json',
    }
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  const response = await fetch(url, options)
  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`Hookdeck API error: ${response.status} ${response.statusText} - ${responseText}`)
  }
  return JSON.parse(responseText)
}

// Endpoint para ler configuração atual dos webhooks do time
app.get('/api/webhooks/config', async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const configs = await query`
      SELECT * FROM webhook_configs WHERE team_id = ${teamId}
    `
    // Se não houver configurações, retornar um array vazio
    if (!configs || configs.length === 0) {
      return res.json([])
    }
    res.json(configs)
  } catch (error) {
    console.error('Error fetching webhook configs:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Endpoint para salvar configuração dos webhooks
app.post('/api/webhooks/config', async (req: Request, res: Response) => {
  const teamId = getTeamId(req)
  if (!teamId) return res.status(401).json({ error: 'Unauthorized' })
  
  try {
    const {
      apiKey,
      registrationWebhook,
      paymentWebhook,
      isConnected,
      registrationWebhookUrl,
      paymentWebhookUrl,
      hookdeckData
    } = req.body
    
    // Verificar se já existe configuração para este time
    const existingConfig = await query`
      SELECT id, api_key FROM webhook_configs WHERE team_id = ${teamId}
    `
    
    if (existingConfig.length > 0) {
      // Atualizar configuração existente, mantendo a api_key existente se não fornecida
      const currentApiKey = existingConfig[0].api_key
      await query`
        UPDATE webhook_configs
        SET 
          api_key = ${apiKey || currentApiKey},
          registration_webhook = ${registrationWebhook},
          payment_webhook = ${paymentWebhook},
          is_connected = ${isConnected},
          registration_webhook_url = ${registrationWebhookUrl},
          payment_webhook_url = ${paymentWebhookUrl},
          hookdeck_data = ${JSON.stringify(hookdeckData)}::jsonb,
          updated_at = NOW()
        WHERE team_id = ${teamId}
      `
    } else {
      // Criar nova configuração com uma nova api_key se não fornecida
      await query`
        INSERT INTO webhook_configs (
          team_id,
          api_key,
          registration_webhook,
          payment_webhook,
          is_connected,
          registration_webhook_url,
          payment_webhook_url,
          hookdeck_data,
          created_at,
          updated_at
        ) VALUES (
          ${teamId},
          ${apiKey || crypto.randomUUID()},
          ${registrationWebhook},
          ${paymentWebhook},
          ${isConnected},
          ${registrationWebhookUrl},
          ${paymentWebhookUrl},
          ${JSON.stringify(hookdeckData)}::jsonb,
          NOW(),
          NOW()
        )
      `
    }
    
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error saving webhook config:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Setup webhook endpoint
app.post('/api/webhooks/setup', async (req: Request, res: Response) => {
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
    const timestamp = Date.now()
    const destination = await makeHookdeckRequest('/destinations', 'POST', {
      name: `webhook-${webhookType}-user-${teamId}-${timestamp}`,
      config: {
        url: `${req.protocol}://${req.get('host')}/api/webhooks/${webhookType}/${teamId}`
      }
    })

    // Step 2: Create source
    const source = await makeHookdeckRequest('/sources', 'POST', {
      name: `${webhookType}-user-${teamId}-${timestamp}`,
      type: 'WEBHOOK',
      alias: `${webhookType}-user-${teamId}-${timestamp}`,
      label: `${webhookType.charAt(0).toUpperCase() + webhookType.slice(1)} Webhook`
    })

    // Step 3: Create connection
    const connection = await makeHookdeckRequest('/connections', 'POST', {
      name: `connection-${webhookType}-user-${teamId}-${timestamp}`,
      source_id: source.id,
      destination_id: destination.id
    })

    // Check if webhook config exists
    const existing = await query`
      SELECT id FROM webhook_configs WHERE team_id = ${teamId}
    `

    const hookdeckData = {
      [webhookType]: { destination, source, connection }
    }

    if (existing.length > 0) {
      // Update existing config
      if (webhookType === 'registrations') {
        await query`
          UPDATE webhook_configs
          SET registration_webhook = true,
              registration_webhook_url = ${source.url},
              is_connected = true,
              hookdeck_data = COALESCE(hookdeck_data, '{}'::jsonb) || ${JSON.stringify(hookdeckData)}::jsonb,
              updated_at = NOW()
          WHERE team_id = ${teamId}
        `
      } else {
        await query`
          UPDATE webhook_configs
          SET payment_webhook = true,
              payment_webhook_url = ${source.url},
              is_connected = true,
              hookdeck_data = COALESCE(hookdeck_data, '{}'::jsonb) || ${JSON.stringify(hookdeckData)}::jsonb,
              updated_at = NOW()
          WHERE team_id = ${teamId}
        `
      }
    } else {
      // Create new config
      await query`
        INSERT INTO webhook_configs (
          team_id,
          api_key,
          registration_webhook,
          payment_webhook,
          is_connected,
          registration_webhook_url,
          payment_webhook_url,
          hookdeck_data,
          created_at,
          updated_at
        ) VALUES (
          ${teamId},
          ${crypto.randomUUID()},
          ${webhookType === 'registrations'},
          ${webhookType === 'payments'},
          true,
          ${webhookType === 'registrations' ? source.url : null},
          ${webhookType === 'payments' ? source.url : null},
          ${JSON.stringify(hookdeckData)}::jsonb,
          NOW(),
          NOW()
        )
      `
    }

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
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Cleanup webhook endpoint
app.delete('/api/webhooks/cleanup', async (req: Request, res: Response) => {
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

    // Atualizar webhook_configs para is_enabled = false
    await query`
      UPDATE webhook_configs
      SET is_enabled = false, updated_at = NOW()
      WHERE team_id = ${teamId} AND (
        (hookdeck_data->'source'->>'id' = ${sourceId})
        OR (hookdeck_data->'connection'->>'id' = ${connectionId})
      )
    `

    return res.status(200).json({
      success: true,
      message: 'Webhook cleaned up successfully'
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to cleanup webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Webhook endpoint for registrations
app.post('/api/webhooks/registrations/:userId', (async (req: Request, res: Response) => {
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
    const result = await query`
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
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}) as RequestHandler)

// Webhook endpoint for payments
app.post('/api/webhooks/payments/:userId', (async (req: Request, res: Response) => {
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
      const result = await query`
        SELECT * FROM registrations 
        WHERE id = ${payload.registration_id}::uuid AND user_id = ${userId}::uuid
      `
      registration = result[0]
    } else {
      const result = await query`
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
    const updateResult = await query`
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
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}) as RequestHandler)

// Start the server
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})