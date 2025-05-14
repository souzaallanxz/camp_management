import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables corretamente
dotenv.config();

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);
const sqlVercel = sql;

// Initialize Express app
import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://campmanagement.vercel.app', 'https://shadcn-admin.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}));

// Parse JSON request bodies
app.use(express.json());

// Middleware para definir cabeçalhos de cache para impedir o cache das respostas da API
app.use((req, res, next) => {
  // Impedir o cache para todas as rotas de API
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY);

// === VERSÃO SEM PREFIXO /api === //

// Sign in route
app.post('/auth/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await sqlVercel`
      SELECT id, email, name, password_hash, team_id 
      FROM public.users 
      WHERE email = ${email}
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    });
  } catch (error) {
    console.error('Error in sign-in:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user route
app.get('/auth/me', async (req, res) => {
  // Define cache headers
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Find user by token (which is the user ID)
    const userResult = await sqlVercel`
      SELECT id, email, name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id,
      role: user.role
    });
  } catch (error) {
    console.error('Error in get current user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === GET CURRENT USER'S TEAM ===
app.get('/teams/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    // Buscar o usuário pelo token (id)
    const userResult = await sqlVercel`
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
    const teamResult = await sqlVercel`
      SELECT * FROM public.teams WHERE id = ${user.team_id}::uuid
    `;
    const team = teamResult[0];
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    return res.json(team);
  } catch (error) {
    console.error('Error getting team:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly Payments
app.get('/dashboard/monthly-payments', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    // Pagamentos do mês atual
    const current = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth}
    `;
    
    // Pagamentos do mês anterior
    const prev = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_amount || 0,
      previous: prev[0]?.total_amount || 0
    });
  } catch (error) {
    console.error('Error getting monthly payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly Registrations
app.get('/dashboard/monthly-registrations', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Registrations do mês atual
    const current = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth}
    `;
    
    // Registrations do mês anterior
    const prev = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_count || 0,
      previous: prev[0]?.total_count || 0
    });
  } catch (error) {
    console.error('Error getting monthly registrations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly Snackbar
app.get('/dashboard/monthly-snackbar', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Snackbar do mês atual
    const current = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth}
    `;
    
    // Snackbar do mês anterior
    const prev = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_amount || 0,
      previous: prev[0]?.total_amount || 0
    });
  } catch (error) {
    console.error('Error getting monthly snackbar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Yearly Campers
app.get('/dashboard/yearly-campers', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Campistas deste ano
    const current = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear}
    `;
    
    // Campistas do ano anterior
    const prev = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear - 1}
    `;

    return res.json({
      current: current[0]?.total_count || 0,
      previous: prev[0]?.total_count || 0
    });
  } catch (error) {
    console.error('Error getting yearly campers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Camp Payments
app.get('/dashboard/camp-payments', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    // Pagamentos e inscrições por acampamento
    const results = await sqlVercel`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COUNT(DISTINCT r.id) as total_registrations
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}::uuid
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

    return res.json(results.map(item => ({
      campId: item.camp_id,
      campName: item.camp_name,
      totalPayments: Number(item.total_amount) || 0,
      totalRegistrations: Number(item.total_registrations) || 0
    })));
  } catch (error) {
    console.error('Error getting camp payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent Registrations
app.get('/dashboard/recent-registrations', async (req, res) => {
  
  const teamId = getTeamId(req);

  try {
    // Tentar descobrir a estrutura da tabela registrations
    const tableInfo = await sqlVercel`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'registrations'
    `;
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    
    // Inscrições recentes - usando nome das colunas corretas
    let results;
    if (teamId) {
      // Se tiver teamId, filtra por ele
      results = await sqlVercel`
        SELECT 
          r.id, 
          r.name as camper_name, 
          r.email as camper_email, 
          r.status, 
          r.created_at,
          c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}::uuid
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Se não tiver teamId, retorna as mais recentes sem filtro
      results = await sqlVercel`
        SELECT 
          r.id, 
          r.name as camper_name, 
          r.email as camper_email, 
          r.status, 
          r.created_at,
          c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `;
    }
    

    const formattedResults = results.map(item => ({
      id: item.id,
      camper_name: item.camper_name,
      camper_email: item.camper_email,
      status: item.status,
      created_at: item.created_at,
      camp_name: item.camp_name
    }));

    return res.json(formattedResults);
  } catch (error) {
    console.error('Error getting recent registrations - DETALHADO:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      database_url_set: process.env.DATABASE_URL ? true : false 
    });
  }
});

// === VERSÃO COM PREFIXO /api === //

// Sign in route
app.post('/api/auth/sign-in', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.error('Email ou senha não fornecidos');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    
    // Find user by email (wrapped in try/catch)
    let userResult;
    try {
      userResult = await sqlVercel`
        SELECT id, email, name, password_hash, team_id 
        FROM public.users 
        WHERE email = ${email}
      `;
    } catch (dbError) {
      console.error('Erro ao consultar banco de dados:', dbError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: dbError.message,
        database_url_set: !!process.env.DATABASE_URL
      });
    }

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    
    // Verify password
    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) { 
      return res.status(500).json({ error: 'Password verification error' });
    }

    if (!isPasswordValid) { 
      return res.status(401).json({ error: 'Invalid credentials' });
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
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL 
    });
  }
});

// Get current user route
app.get('/api/auth/me', async (req, res) => {
  // Define cache headers
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Find user by token (which is the user ID)
    const userResult = await sqlVercel`
      SELECT id, email, name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id,
      role: user.role
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === GET CURRENT USER'S TEAM ===
app.get('/api/teams/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    // Buscar o usuário pelo token (id)
    const userResult = await sqlVercel`
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
    const teamResult = await sqlVercel`
      SELECT * FROM public.teams WHERE id = ${user.team_id}::uuid
    `;
    const team = teamResult[0];
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    return res.json(team);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== DASHBOARD ENDPOINTS =====

// Monthly Payments
app.get('/api/dashboard/monthly-payments', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    // Pagamentos do mês atual
    const current = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth}
    `;
    
    // Pagamentos do mês anterior
    const prev = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_amount || 0,
      previous: prev[0]?.total_amount || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly Registrations
app.get('/api/dashboard/monthly-registrations', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Registrations do mês atual
    const current = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth}
    `;
    
    // Registrations do mês anterior
    const prev = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_count || 0,
      previous: prev[0]?.total_count || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly Snackbar
app.get('/api/dashboard/monthly-snackbar', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Snackbar do mês atual
    const current = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth}
    `;
    
    // Snackbar do mês anterior
    const prev = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentMonth === 1 ? currentYear - 1 : currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth === 1 ? 12 : currentMonth - 1}
    `;

    return res.json({
      current: current[0]?.total_amount || 0,
      previous: prev[0]?.total_amount || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Yearly Campers
app.get('/api/dashboard/yearly-campers', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Campistas deste ano
    const current = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear}
    `;
    
    // Campistas do ano anterior
    const prev = await sqlVercel`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear - 1}
    `;

    return res.json({
      current: current[0]?.total_count || 0,
      previous: prev[0]?.total_count || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Camp Payments
app.get('/api/dashboard/camp-payments', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    // Pagamentos e inscrições por acampamento
    const results = await sqlVercel`
      SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COUNT(DISTINCT r.id) as total_registrations
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}::uuid
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

    return res.json(results.map(item => ({
      campId: item.camp_id,
      campName: item.camp_name,
      totalPayments: Number(item.total_amount) || 0,
      totalRegistrations: Number(item.total_registrations) || 0
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent Registrations
app.get('/api/dashboard/recent-registrations', async (req, res) => {  
  
  const teamId = getTeamId(req);
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    
    // Inscrições recentes - usando nome das colunas corretas
    
    let results;
    if (teamId) {
      // Se tiver teamId, filtra por ele
      results = await sqlVercel`
        SELECT 
          r.id, 
          r.name as camper_name, 
          r.email as camper_email, 
          r.status, 
          r.created_at,
          c.name as camp_name,
          COALESCE(SUM(p.amount), 0) as total_paid
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        LEFT JOIN payments p ON r.id = p.registration_id
        WHERE c.team_id = ${teamId}::uuid
        GROUP BY r.id, r.name, r.email, r.status, r.created_at, c.name
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Se não tiver teamId, retorna as mais recentes sem filtro
      results = await sqlVercel`
        SELECT 
          r.id, 
          r.name as camper_name, 
          r.email as camper_email, 
          r.status, 
          r.created_at,
          c.name as camp_name,
          COALESCE(SUM(p.amount), 0) as total_paid
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        LEFT JOIN payments p ON r.id = p.registration_id
        GROUP BY r.id, r.name, r.email, r.status, r.created_at, c.name
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `;
    }
    

    const formattedResults = results.map(item => ({
      id: item.id,
      name: item.camper_name,
      email: item.camper_email,
      status: item.status,
      createdAt: item.created_at,
      campName: item.camp_name,
      totalPaid: Number(item.total_paid) || 0
    }));
    
    return res.json(formattedResults);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      database_url_set: process.env.DATABASE_URL ? true : false 
    });
  }
});

// Rota de diagnóstico (sem verificação de teamId)
app.get('/debug/registrations', async (req, res) => {
  
  try {
    // Verificar conexão com o banco
    const testConnection = await sqlVercel`SELECT 1 as test`;
    
    // Dados básicos das tabelas
    
    // Contagem de registrations
    const registrationCount = await sqlVercel`SELECT COUNT(*) as count FROM registrations`;
    
    // Contagem de camps
    const campsCount = await sqlVercel`SELECT COUNT(*) as count FROM camps`;
    
    // Contagem de teams
    const teamsCount = await sqlVercel`SELECT COUNT(*) as count FROM teams`;
    
    // Listar alguns teams para diagnóstico
    const teams = await sqlVercel`SELECT id, name FROM teams LIMIT 5`;
    
    // Tentar buscar as 5 registrations mais recentes
    const results = await sqlVercel`
      SELECT 
        r.id, 
        r.name as camper_name, 
        r.email as camper_email,
        r.status,
        r.created_at,
        c.name as camp_name,
        c.team_id
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `;

    return res.json({
      success: true,
      database_connection: "OK",
      counts: {
        registrations: registrationCount[0]?.count || 0,
        camps: campsCount[0]?.count || 0,
        teams: teamsCount[0]?.count || 0
      },
      teams: teams.map(t => ({ id: t.id, name: t.name })),
      sample_registrations: results.map(item => ({
        id: item.id,
        camper_name: item.camper_name,
        camp_name: item.camp_name,
        team_id: item.team_id
      }))
    });
  } catch (error) { 
    return res.status(500).json({ 
      success: false, 
      error: 'Database connection error',
      details: error.message,
      env_database_url_set: process.env.DATABASE_URL ? "YES" : "NO"
    });
  }
});

// Rota para verificar variáveis de ambiente (sem dados sensíveis)
app.get('/debug/env', async (req, res) => {
  
  try {
    return res.json({
      database_url_set: process.env.DATABASE_URL ? true : false,
      resend_api_key_set: process.env.VITE_RESEND_API_KEY ? true : false,
      node_env: process.env.NODE_ENV || 'not set',
      available_env_vars: Object.keys(process.env).filter(key => 
        !key.includes('KEY') && 
        !key.includes('SECRET') && 
        !key.includes('TOKEN') && 
        !key.includes('PASSWORD') &&
        !key.includes('URL')
      ),
      debug_mode: true
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error checking environment variables' });
  }
});

// Helper para obter o teamId do header
function getTeamId(req) {
  // Check for x-team-id header
  const teamId = req.headers['x-team-id'];
  
  // Se encontrou um teamId válido no header, usar
  if (teamId && typeof teamId === 'string') {
    return teamId;
  }
  
  // Se não tiver o teamId no header, tentar buscá-lo do token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // Armazenar o token para uso posterior
    req.userToken = token;
    
    // Neste ponto, poderíamos fazer uma verificação síncrona ao banco 
    // de dados para obter o team_id do usuário. Para evitar complexidade,
    // essa implementação seria melhor feita num middleware separado.
  }
  
  // Se não encontrou o teamId, permitir o uso do query parameter
  if (req.query && req.query.teamId) {
    return req.query.teamId;
  }
  
  // Se chegou aqui, não conseguiu encontrar um teamId
  return null;
}

// ===== REGISTRATIONS ENDPOINTS =====

// List all registrations
app.get('/registrations', async (req, res) => {
  // Define cache headers
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    // Get all camps for this team
    const campIds = await sqlVercel`
      SELECT id FROM camps WHERE team_id = ${teamId}::uuid
    `;

    if (campIds.length === 0) {
      return res.json([]);
    }

    // Create array of camp IDs
    const campIdList = campIds.map((row) => row.id);

    // Get all registrations for these camps
    const registrations = await sqlVercel`
      SELECT 
        r.id,
        r.form_id,
        r.name as camper_name,
        r.email as camper_email,
        r.contact,
        r.status,
        r.created_at,
        r.updated_at,
        r.user_id,
        r.camp_id,
        r.onboarding_status,
        r.snack_bar_balance,
        r.total_amount_paid,
        r.id_number,
        r.sns_number,
        r.date_of_birth,
        r.dietary_restrictions,
        r.guardian_name,
        r.guardian_email,
        r.guardian_phone,
        c.name as camp_name,
        c.start_date as camp_start_date,
        c.end_date as camp_end_date
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.camp_id = ANY(${campIdList}::uuid[])
      ORDER BY r.created_at DESC
    `;

    return res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List all registrations (with /api prefix)
app.get('/api/registrations', async (req, res) => {
  // Define cache headers
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    // Buscar registros com JOIN em camps e LEFT JOIN em payments
    const registrationsQuery = await sqlVercel`
      SELECT 
        r.id,
        r.form_id,
        r.name as camper_name,
        r.email as camper_email,
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
      WHERE c.team_id = ${teamId}::uuid
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

    return res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CAMPERS ENDPOINTS =====

// Get all campers
app.get('/campers', async (req, res) => {
  
  try {
    const teamId = getTeamId(req);
    
    let results;
    if (teamId) {
      results = await sqlVercel`
        SELECT cm.*, r.name as registration_name, c.name as camp_name
        FROM campers cm
        JOIN registrations r ON cm.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}::uuid
        ORDER BY cm.created_at DESC
      `;
    } else {
      // Modo diagnóstico
      results = await sqlVercel`
        SELECT cm.*, r.name as registration_name, c.name as camp_name
        FROM campers cm
        JOIN registrations r ON cm.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        ORDER BY cm.created_at DESC
        LIMIT 20
      `;
    }
    
    return res.json(results);
  } catch (error) {
    console.error('Error getting campers:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// Get camper by ID
app.get('/api/campers/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const camper = await sqlVercel`
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
});

// ===== USERS ENDPOINTS =====

// Get all users
app.get('/users', async (req, res) => {
  
  try {
    const teamId = getTeamId(req);
    
    // Usuários só são acessíveis para a mesma equipe ou superadmin
    let results;
    if (teamId) {
      results = await sqlVercel`
        SELECT id, email, name, role, team_id, created_at, updated_at
        FROM users
        WHERE team_id = ${teamId}::uuid
        ORDER BY created_at DESC
      `;
    } else {
      // Modo diagnóstico - omite informações sensíveis
      results = await sqlVercel`
        SELECT id, email, name, role, team_id, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }
    
    return res.json(results);
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// ===== CAMPS ENDPOINTS =====

// Get all camps
app.get('/camps', async (req, res) => {
  
  try {
    const teamId = getTeamId(req);
    
    let results;
    if (teamId) {
      results = await sqlVercel`
        SELECT *
        FROM camps
        WHERE team_id = ${teamId}::uuid
        ORDER BY created_at DESC
      `;
    } else {
      // Modo diagnóstico
      results = await sqlVercel`
        SELECT *
        FROM camps
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }
    
    return res.json(results);
  } catch (error) {
    console.error('Error getting camps:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// Get camp by ID
app.get('/api/camps/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sqlVercel`
      SELECT * FROM camps WHERE id = ${id} AND team_id = ${teamId}
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Camp not found' });
    }
    res.json(result[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar acampamento.' });
  }
});

// ===== SETTINGS ENDPOINTS =====

// Get profile settings
app.get('/settings/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const result = await sqlVercel`
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
});

// Get organization settings
app.get('/settings/organization', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const userResult = await sqlVercel`
      SELECT team_id
      FROM users
      WHERE id = ${token}::uuid
    `;
    
    if (userResult.length === 0 || !userResult[0].team_id) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const teamId = userResult[0].team_id;
    
    const result = await sqlVercel`
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
});

// ===== VERSÃO COM PREFIXO /API =====

// Get all registrations
app.get('/api/registrations', async (req, res) => {
  
  try {
    const teamId = getTeamId(req);
      
    let results;
    if (teamId) {
      results = await sqlVercel`
        SELECT r.*, c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}::uuid
        ORDER BY r.created_at DESC
      `;
    } else {
      // Modo diagnóstico
      results = await sqlVercel`
        SELECT r.*, c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 20
      `;
    }
    
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// Get registration by ID
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sqlVercel`
      SELECT 
        r.id,
        r.form_id,
        r.name as camper_name,
        r.email as camper_email,
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
      WHERE r.id = ${id}::uuid
      GROUP BY r.id, r.form_id, r.name, r.email, r.contact, r.status, r.created_at, r.updated_at, r.user_id, r.camp_id, r.onboarding_status, r.snack_bar_balance, r.id_number, r.sns_number, r.date_of_birth, r.dietary_restrictions, r.guardian_name, r.guardian_email, r.guardian_phone, c.name, c.start_date, c.end_date, c.price
      LIMIT 1
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    const registration = result[0];
    const totalPaid = parseFloat(registration.total_paid) || 0;
    const campPrice = parseFloat(registration.camp_price) || 0;
    let status = 'unpaid';
    if (totalPaid >= campPrice || (campPrice > 0 && (campPrice - totalPaid) < 1)) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }
    return res.json({
      ...registration,
      total_paid: totalPaid,
      camp_price: campPrice,
      status
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all campers
app.get('/api/campers', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const campers = await sqlVercel`
      SELECT 
        ca.*, 
        c.name as camp_name,
        r.snack_bar_balance
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campistas.' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const users = await sqlVercel`
      SELECT * FROM users WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// Get all camps
app.get('/api/camps', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const camps = await sqlVercel`
      SELECT * FROM camps WHERE team_id = ${teamId} ORDER BY created_at DESC
    `;
    res.json(camps);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar acampamentos.' });
  }
});

// Get profile settings
app.get('/api/settings/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const result = await sqlVercel`
      SELECT id, email, name, role, team_id, created_at, updated_at
      FROM users
      WHERE id = ${token}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PAYMENTS ENDPOINTS =====

// Get payments by registration ID
app.get('/api/payments', async (req, res) => {
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
    const registration = await sqlVercel`
      SELECT r.id 
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registrationId}::uuid
      AND c.team_id = ${teamId}::uuid
    `;
    
    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }
    
    const payments = await sqlVercel`
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
    res.status(500).json({ error: 'Error fetching payments' });
  }
});

// Create new payment
app.post('/api/payments', async (req, res) => {
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
    const reg = await sqlVercel`
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id} AND c.team_id = ${teamId}
    `;
    if (!reg[0]) {
      return res.status(400).json({ error: 'Registration does not belong to your team' });
    }
    const now = new Date().toISOString();
    const paymentStatus = payment_method === 'MB Way' ? 'pending' : 'confirmed';
    const result = await sqlVercel`
      INSERT INTO payments (
        registration_id, payment_method, amount, payment_date, phone_number, payment_link, payment_status, created_at, updated_at
      ) VALUES (
        ${registration_id}, ${payment_method}, ${amount}, ${payment_date}, ${phone_number}, ${payment_link}, ${paymentStatus}, ${now}, ${now}
      ) RETURNING *
    `;
    // Atualizar status da inscrição após criar pagamento
    // Função utilitária (pode ser implementada como helper ou inline)
    const totalPaidResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE registration_id = ${registration_id}
    `;
    const registrationResult = await sqlVercel`
      SELECT r.id, c.price as camp_price
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id}
    `;
    if (registrationResult[0]) {
      const campPrice = Number(registrationResult[0].camp_price || 0);
      const totalPaid = Number(totalPaidResult[0].total || 0);
      let newStatus = 'unpaid';
      if (totalPaid >= campPrice) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      await sqlVercel`
        UPDATE registrations SET status = ${newStatus}, total_amount_paid = ${totalPaid} WHERE id = ${registration_id}
      `;
    }
    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar pagamento.' });
  }
});

// Get latest payment link
app.get('/api/payments/latest-link', async (req, res) => {
  try {
    const { registrationId } = req.query;
    
    if (!registrationId) {
      return res.status(400).json({ error: 'Registration ID is required' });
    }
    
    const result = await sqlVercel`
      SELECT payment_link
      FROM payments
      WHERE registration_id = ${registrationId}::uuid
        AND payment_link IS NOT NULL
        AND payment_link != ''
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (result.length === 0) {
      return res.json({ payment_link: null });
    }
    
    return res.json({ payment_link: result[0].payment_link });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment
app.put('/api/payments/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { registration_id, ...fields } = req.body;
    const now = new Date().toISOString();
    const setFields = Object.entries(fields).map(([key, value]) => `${key} = '${value}'`).join(', ');
    const result = await sqlVercel.unsafe(
      `UPDATE payments SET ${setFields}, updated_at = '${now}' WHERE id = $1 AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = $2) RETURNING *`,
      [id, teamId]
    );
    if (!result[0]) {
      return res.status(404).json({ error: 'Payment not found or you do not have permission to update it' });
    }
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
  }
});

// Delete payment
app.delete('/api/payments/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Get registration_id before deleting
    const payment = await sqlVercel`
      SELECT registration_id FROM payments WHERE id = ${id}
    `;
    const result = await sqlVercel`
      DELETE FROM payments WHERE id = ${id} AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Payment not found or you do not have permission to delete it' });
    }
    // Atualizar status da inscrição após deletar pagamento
    if (payment[0] && payment[0].registration_id) {
      const registration_id = payment[0].registration_id;
      const totalPaidResult = await sqlVercel`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE registration_id = ${registration_id}
      `;
      const registrationResult = await sqlVercel`
        SELECT r.id, c.price as camp_price
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE r.id = ${registration_id}
      `;
      if (registrationResult[0]) {
        const campPrice = Number(registrationResult[0].camp_price || 0);
        const totalPaid = Number(totalPaidResult[0].total || 0);
        let newStatus = 'unpaid';
        if (totalPaid >= campPrice) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partial';
        }
        await sqlVercel`
          UPDATE registrations SET status = ${newStatus}, total_amount_paid = ${totalPaid} WHERE id = ${registration_id}
        `;
      }
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar pagamento.' });
  }
});

// Delete registration
app.delete('/api/registrations/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Only delete if registration belongs to a camp of the team
    const result = await sqlVercel`
      DELETE FROM registrations WHERE id = ${id} AND camp_id IN (SELECT id FROM camps WHERE team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Registration not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar inscrição.' });
  }
});

// Delete camper
app.delete('/api/campers/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const result = await sqlVercel`
      DELETE FROM campers WHERE id = ${id} AND registration_id IN (SELECT r.id FROM registrations r JOIN camps c ON r.camp_id = c.id WHERE c.team_id = ${teamId}) RETURNING *
    `;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camper not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar campista.' });
  }
});

// Delete camp
app.delete('/api/camps/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    // Check if there are any registrations for this camp
    const regs = await sqlVercel`SELECT id FROM registrations WHERE camp_id = ${id} LIMIT 1`;
    if (regs.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.' });
    }
    const result = await sqlVercel`DELETE FROM camps WHERE id = ${id} AND team_id = ${teamId} RETURNING *`;
    if (!result[0]) {
      return res.status(404).json({ error: 'Camp not found or you do not have permission to delete it' });
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar acampamento.' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {


  const teamId = getTeamId(req);
  
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { id } = req.params;
    const { name, email, role, first_name, last_name } = req.body;
    const now = new Date().toISOString();
    
    // Primeiro, vamos verificar se o usuário existe e pertence ao time
    const existingUser = await sqlVercel`
      SELECT id, team_id FROM users WHERE id = ${id}::uuid
    `;

    if (!existingUser[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser[0].team_id !== teamId) {
      return res.status(403).json({ error: 'User belongs to a different team' });
    }
    
    // Atualizar o usuário usando template literal
    const result = await sqlVercel`
      UPDATE users 
      SET 
        name = ${name},
        email = ${email},
        role = ${role},
        first_name = ${first_name},
        last_name = ${last_name},
        updated_at = ${now}
      WHERE id = ${id}::uuid 
        AND team_id = ${teamId}::uuid
      RETURNING *
    `;


    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to update it' });
    }

    return res.json(result[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { id } = req.params;

    // Primeiro, vamos verificar se o usuário existe e pertence ao time
    const existingUser = await sqlVercel`
      SELECT id, team_id FROM users WHERE id = ${id}::uuid
    `;

    if (!existingUser[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser[0].team_id !== teamId) {
      return res.status(403).json({ error: 'User belongs to a different team' });
    }

    // Deletar o usuário
    const result = await sqlVercel`
      DELETE FROM users 
      WHERE id = ${id}::uuid 
        AND team_id = ${teamId}::uuid
      RETURNING *
    `;

    if (!result[0]) {
      return res.status(404).json({ error: 'User not found or you do not have permission to delete it' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Error deleting user' });
  }
});

// Create a new user for the team
app.post('/api/users', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { firstName, lastName, email, role } = req.body;
    
    // Monta o nome completo usando firstName e lastName
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;
    
    if (!fullName || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const now = new Date().toISOString();
    const result = await sqlVercel`
      INSERT INTO users (
        name, 
        first_name, 
        last_name, 
        email, 
        role, 
        team_id, 
        created_at, 
        updated_at
      ) VALUES (
        ${fullName}, 
        ${firstName}, 
        ${lastName}, 
        ${email}, 
        ${role}, 
        ${teamId}, 
        ${now}, 
        ${now}
      ) RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Novo endpoint: Criar camp
app.post('/api/camps', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { name, start_date, end_date, price } = req.body;
    if (!name || !start_date || !end_date || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, start_date, end_date, price' });
    }
    const now = new Date().toISOString();
    const result = await sqlVercel`
      INSERT INTO camps (name, start_date, end_date, price, team_id, created_at, updated_at)
      VALUES (${name}, ${start_date}, ${end_date}, ${price}, ${teamId}, ${now}, ${now})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Erro ao criar camp:', error);
    res.status(500).json({ error: 'Erro ao criar acampamento.' });
  }
});

// Atualizar camp
app.put('/api/camps/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { name, start_date, end_date, price } = req.body;
    // Verifica se o camp existe e pertence ao time
    const existing = await sqlVercel`SELECT * FROM camps WHERE id = ${id} AND team_id = ${teamId}`;
    if (!existing[0]) {
      return res.status(404).json({ error: 'Camp not found or does not belong to your team' });
    }
    const now = new Date().toISOString();
    const result = await sqlVercel`
      UPDATE camps SET
        name = ${name || existing[0].name},
        start_date = ${start_date || existing[0].start_date},
        end_date = ${end_date || existing[0].end_date},
        price = ${price !== undefined ? price : existing[0].price},
        updated_at = ${now}
      WHERE id = ${id} AND team_id = ${teamId}
      RETURNING *
    `;
    res.json(result[0]);
  } catch (error) {
    console.error('Erro ao atualizar camp:', error);
    res.status(500).json({ error: 'Erro ao atualizar acampamento.' });
  }
});

// Create new camper
app.post('/api/campers', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { name, email, contact, registration_id, camp, form_id, additional_notes } = req.body;
    
    
    // Get registration data to use name and email if not provided
    const registration = await sqlVercel`
      SELECT r.id, r.name, r.email, r.contact
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id}::uuid
      AND c.team_id = ${teamId}::uuid
    `;

    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }

    // Use registration data if not provided in request
    const camperName = name || registration[0].name;
    const camperEmail = email || registration[0].email;
    const camperContact = contact || registration[0].contact;

    if (!camperName || !camperEmail || !registration_id || !camp) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { 
          name: camperName, 
          email: camperEmail, 
          registration_id, 
          camp 
        }
      });
    }

    const now = new Date().toISOString();
    const result = await sqlVercel`
      INSERT INTO campers (
        name, 
        email, 
        contact,
        registration_id, 
        camp, 
        form_id, 
        additional_notes,
        created_at, 
        updated_at
      ) VALUES (
        ${camperName}, 
        ${camperEmail}, 
        ${camperContact},
        ${registration_id}, 
        ${camp}, 
        ${form_id}, 
        ${additional_notes},
        ${now}, 
        ${now}
      ) RETURNING *
    `;

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creating camper' });
  }
});

// Update registration onboarding status
app.patch('/api/registrations/:id/onboarding-status', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const { id } = req.params;
    const { onboarding_status } = req.body;


    if (!onboarding_status) {
      return res.status(400).json({ 
        error: 'Onboarding status is required',
        details: { receivedBody: req.body }
      });
    }

    // Verify if registration belongs to the team
    const registration = await sqlVercel`
      SELECT r.id 
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id}::uuid
      AND c.team_id = ${teamId}::uuid
    `;

    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }

    const now = new Date().toISOString();
    const result = await sqlVercel`
      UPDATE registrations 
      SET onboarding_status = ${onboarding_status}, updated_at = ${now}
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error updating registration onboarding status' });
  }
});

// Update camper
app.put('/api/campers/:id', async (req, res) => {


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
      registration_id,
      form_id,
      camp,
      additional_notes,
      id_number,
      sns_number,
      date_of_birth,
      dietary_restrictions,
      guardian_name,
      guardian_email,
      guardian_phone,
      snack_bar_balance
    } = req.body;

    // Primeiro, vamos verificar se o camper existe e pertence ao time
    const existingCamper = await sqlVercel`
      SELECT ca.*, c.team_id 
      FROM campers ca
      JOIN registrations r ON ca.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE ca.id = ${id}::uuid
    `;

    if (!existingCamper[0]) {
      return res.status(404).json({ error: 'Camper not found' });
    }

    if (existingCamper[0].team_id !== teamId) {
      return res.status(403).json({ error: 'Camper belongs to a different team' });
    }

    // Atualizar o camper usando template literal
    const result = await sqlVercel`
      UPDATE campers 
      SET 
        name = ${name},
        email = ${email},
        contact = ${contact},
        form_id = ${form_id},
        camp = ${camp},
        additional_notes = ${additional_notes},
        snack_bar_balance = ${Number(snack_bar_balance) || 0},
        updated_at = NOW()
      WHERE id = ${id}::uuid 
        AND registration_id IN (
          SELECT r.id 
          FROM registrations r 
          JOIN camps c ON r.camp_id = c.id 
          WHERE c.team_id = ${teamId}::uuid
        )
      RETURNING *
    `;


    if (!result[0]) {
      return res.status(404).json({ error: 'Camper not found or you do not have permission to update it' });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error('Erro ao atualizar camper:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Erro ao atualizar campista.' });
  }
});

// ===== SNACKBAR BALANCE ENDPOINTS =====

// Add balance to snackbar card (with /api prefix)
app.post('/api/snackbar-balance', async (req, res) => {

  const teamId = getTeamId(req);
  
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { registration_id, amount } = req.body;

    if (!registration_id || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: registration_id and amount' });
    }

    // Verify if registration belongs to the team
    const registration = await sqlVercel`
      SELECT r.id, r.snack_bar_balance
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id}::uuid
      AND c.team_id = ${teamId}::uuid
    `;

    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }

    const currentBalance = parseFloat(registration[0].snack_bar_balance) || 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Update the registration's snack bar balance
    const result = await sqlVercel`
      UPDATE registrations 
      SET 
        snack_bar_balance = ${newBalance},
        updated_at = NOW()
      WHERE id = ${registration_id}::uuid
      RETURNING *
    `;


    if (!result[0]) {
      return res.status(500).json({ error: 'Failed to update snack bar balance' });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error('Erro ao adicionar saldo ao cartão:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Erro ao adicionar saldo ao cartão.' });
  }
});

// Export the Express app as a serverless function
export default app; 