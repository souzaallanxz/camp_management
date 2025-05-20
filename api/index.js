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

// Adicionar no início do arquivo, após as importações
const logs = [];
const MAX_LOGS = 100;

const debugLog = (message, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data
  };
  logs.unshift(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  console.error(`[DEBUG] ${message}:`, JSON.stringify(data, null, 2));
};

// Endpoint para visualizar logs
app.get('/api/debug/logs', async (req, res) => {
  res.json({
    logs,
    count: logs.length,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de debug para testar a conexão com o banco
app.get('/api/debug/db', async (req, res) => {
  try {
    const test = await sqlVercel`SELECT NOW() as time`;
    res.json({
      success: true,
      database: {
        connected: true,
        time: test[0].time
      },
      env: {
        database_url_set: !!process.env.DATABASE_URL,
        node_env: process.env.NODE_ENV
      }
    });
  } catch (error) {
    debugLog('Database connection error', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      success: false,
      error: 'Database connection error',
      details: error.message
    });
  }
});

// === VERSÃO SEM PREFIXO /api === //

// Sign in route
app.post('/auth/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await sqlVercel`
      SELECT id, email, first_name, last_name, password_hash, team_id 
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
      SELECT id, email, first_name, last_name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Combine first_name and last_name to create the full name
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: fullName || null, // Return null if no name is available
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
        SELECT id, email, first_name, last_name, password_hash, team_id 
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
    const userWithoutPassword = { 
      ...user,
      name: `${user.first_name} ${user.last_name}` // Combine first_name and last_name for backward compatibility
    };
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
      SELECT id, email, first_name, last_name, team_id, role, created_at, updated_at
      FROM public.users
      WHERE id = ${token}::uuid
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Combine first_name and last_name to create the full name
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: fullName || null, // Return null if no name is available
      team_id: user.team_id,
      role: user.role
    });
  } catch (error) {
    console.error('Error in get current user:', error);
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
        SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at
        FROM users
        WHERE team_id = ${teamId}::uuid
        ORDER BY created_at DESC
      `;
    } else {
      // Modo diagnóstico - omite informações sensíveis
      results = await sqlVercel`
        SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at
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
      SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at
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
      SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at 
      FROM users 
      WHERE team_id = ${teamId} 
      ORDER BY created_at DESC
    `;
    
    // Transform the response to include a combined name field
    const transformedUsers = users.map(user => ({
      ...user,
      name: `${user.first_name} ${user.last_name}`
    }));
    
    res.json(transformedUsers);
  } catch (error) {
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
      SELECT id, email, first_name, last_name, role, team_id, created_at, updated_at
      FROM users
      WHERE id = ${token}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Transform the response to include a combined name field
    const user = {
      ...result[0],
      name: `${result[0].first_name} ${result[0].last_name}`
    };
    
    return res.json(user);
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
    const { email, role, firstName, lastName } = req.body;
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
    
    // Atualizar o usuário sem o campo name
    const result = await sqlVercel`
      UPDATE users 
      SET 
        email = ${email},
        role = ${role},
        first_name = ${firstName},
        last_name = ${lastName},
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
  const debug = {
    timestamp: new Date().toISOString(),
    request: {
      headers: req.headers,
      body: req.body,
      url: req.url,
      method: req.method
    }
  };

  const teamId = getTeamId(req);
  debug.teamId = teamId;
  
  if (!teamId) {
    return res.status(401).json({ 
      error: 'Missing x-team-id header',
      debug
    });
  }

  try {
    const { firstName, lastName, email, role } = req.body;
    debug.userData = { firstName, lastName, email, role };
    
    // Validação dos campos obrigatórios
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { firstName, lastName, email, role },
        debug
      });
    }

    // Validação do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        debug
      });
    }

    // Validação do role
    const validRoles = ['superadmin', 'admin', 'contributor', 'cashier', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        validRoles,
        debug
      });
    }

    // Verificar se o email já existe
    try {
      const existingUser = await sqlVercel`
        SELECT id FROM users WHERE email = ${email}
      `;
      debug.existingUserCheck = { found: existingUser.length > 0, result: existingUser };

      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: 'Email already exists',
          debug
        });
      }
    } catch (dbError) {
      debug.databaseError = {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail
      };
      throw dbError;
    }
    
    const now = new Date().toISOString();
    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 dias
    const insertData = {
      firstName,
      lastName,
      email,
      role,
      teamId,
      now,
      inviteToken,
      inviteExpiresAt: inviteExpiresAt.toISOString()
    };
    debug.insertData = insertData;

    try {
      // Primeiro, vamos verificar a estrutura da tabela
      const tableInfo = await sqlVercel`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `;
      debug.tableStructure = tableInfo;

      const result = await sqlVercel`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          role, 
          team_id, 
          created_at, 
          updated_at,
          invite_token,
          invite_expires_at
        ) VALUES (
          ${firstName}, 
          ${lastName}, 
          ${email}, 
          ${role}, 
          ${teamId}, 
          ${now}, 
          ${now},
          ${inviteToken},
          ${inviteExpiresAt.toISOString()}
        ) RETURNING *
      `;
      debug.insertResult = result;

      if (!result || result.length === 0) {
        throw new Error('Failed to create user - no result returned');
      }

      // Buscar informações do time para incluir no email
      const teamResult = await sqlVercel`
        SELECT name FROM teams WHERE id = ${teamId}::uuid
      `;
      const teamName = teamResult[0]?.name || 'Sua equipe';

      // Enviar email de convite com link para setup-password
      try {
        await resend.emails.send({
          from: 'Camp Management <noreply@infolio.pt>',
          to: email,
          subject: `Bem-vindo à equipe ${teamName}`,
          html: `
            <h1>Bem-vindo ao Camp Management!</h1>
            <p>Olá ${firstName},</p>
            <p>Você foi adicionado à equipe <b>${teamName}</b> no Camp Management.</p>
            <p>Para definir sua senha e ativar sua conta, clique no link abaixo:</p>
            <p>
              <a href="https://campmanagement.vercel.app/setup-password?token=${inviteToken}">
                Definir minha senha
              </a>
            </p>
            <p>Este link expira em 7 dias.</p>
            <p>Se você não esperava este convite, pode ignorar este email.</p>
          `
        });
        debug.emailSent = true;
      } catch (emailError) {
        debug.emailError = {
          message: emailError.message,
          code: emailError.code
        };
        // Não vamos falhar a criação do usuário se o email falhar
        console.error('Error sending invite email:', emailError);
      }

      res.status(201).json(result[0]);
    } catch (dbError) {
      debug.databaseError = {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        stack: dbError.stack,
        query: 'INSERT INTO users'
      };
      throw dbError;
    }
  } catch (error) {
    debug.error = {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    };
    
    res.status(500).json({ 
      error: 'Error creating user',
      details: error.message,
      code: error.code,
      detail: error.detail,
      debug
    });
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
    const { registration_id, amount, payment_method, phone_number } = req.body;

    if (!registration_id || amount === undefined || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: registration_id, amount, and payment_method' });
    }

    // Verify if registration belongs to the team
    const registration = await sqlVercel`
      SELECT r.id
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registration_id}::uuid
      AND c.team_id = ${teamId}::uuid
    `;

    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found or does not belong to your team' });
    }

    // Insert into snackbar_balance table
    const result = await sqlVercel`
      INSERT INTO snackbar_balance (
        registration_id, 
        amount, 
        payment_method, 
        phone_number,
        created_at,
        updated_at
      ) VALUES (
        ${registration_id}::uuid, 
        ${amount}, 
        ${payment_method}, 
        ${phone_number || null},
        NOW(),
        NOW()
      ) RETURNING *
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

// Create new registration
app.post('/api/registrations', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const {
      name,
      email,
      contact,
      camp_id,
      form_id,
      id_number,
      sns_number,
      date_of_birth,
      dietary_restrictions,
      guardian_name,
      guardian_email,
      guardian_phone
    } = req.body;

    if (!name || !email || !camp_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verifica se o camp pertence ao time
    const camp = await sqlVercel`
      SELECT id FROM camps WHERE id = ${camp_id} AND team_id = ${teamId}
    `;
    if (!camp[0]) {
      return res.status(400).json({ error: 'Camp does not belong to your team' });
    }

    const now = new Date().toISOString();
    const result = await sqlVercel`
      INSERT INTO registrations (
        name, email, contact, camp_id, form_id, id_number, sns_number, date_of_birth,
        dietary_restrictions, guardian_name, guardian_email, guardian_phone, created_at, updated_at
      ) VALUES (
        ${name}, ${email}, ${contact}, ${camp_id}, ${form_id}, ${id_number}, ${sns_number}, ${date_of_birth},
        ${dietary_restrictions}, ${guardian_name}, ${guardian_email}, ${guardian_phone}, ${now}, ${now}
      ) RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ error: 'Error creating registration' });
  }
});

// Setup user account with invite token
app.post('/api/users/setup-account', async (req, res) => {
  const debug = {
    timestamp: new Date().toISOString(),
    request: {
      headers: req.headers,
      body: req.body,
      url: req.url,
      method: req.method
    }
  };

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { token: !!token, password: !!password },
        debug
      });
    }

    // Buscar usuário pelo token de convite
    const userResult = await sqlVercel`
      SELECT id, email, first_name, last_name, invite_token, invite_expires_at
      FROM users
      WHERE invite_token = ${token}
      AND invite_expires_at > NOW()
    `;

    if (!userResult[0]) {
      return res.status(400).json({
        error: 'Invalid or expired invite token',
        debug
      });
    }

    const user = userResult[0];

    // Gerar hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Atualizar usuário com a senha e limpar o token de convite
    const now = new Date().toISOString();
    const result = await sqlVercel`
      UPDATE users
      SET 
        password_hash = ${passwordHash},
        invite_token = NULL,
        invite_expires_at = NULL,
        updated_at = ${now}
      WHERE id = ${user.id}::uuid
      RETURNING id, email, first_name, last_name, role, team_id
    `;

    if (!result[0]) {
      throw new Error('Failed to update user');
    }

    // Enviar email de confirmação
    try {
      await resend.emails.send({
        from: 'Camp Management <noreply@infolio.pt>',
        to: user.email,
        subject: 'Conta configurada com sucesso',
        html: `
          <h1>Conta configurada com sucesso!</h1>
          <p>Olá ${user.first_name},</p>
          <p>Sua conta foi configurada com sucesso. Você já pode fazer login no Camp Management.</p>
          <p>
            <a href="https://campmanagement.vercel.app/login">
              Fazer login
            </a>
          </p>
        `
      });
      debug.emailSent = true;
    } catch (emailError) {
      debug.emailError = {
        message: emailError.message,
        code: emailError.code
      };
      console.error('Error sending confirmation email:', emailError);
    }

    res.json(result[0]);
  } catch (error) {
    debug.error = {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    };

    res.status(500).json({
      error: 'Error setting up account',
      details: error.message,
      debug
    });
  }
});

// Verificar e atualizar estrutura da tabela users
app.get('/api/debug/check-users-table', async (req, res) => {
  try {
    // Verificar colunas existentes
    const columns = await sqlVercel`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;

    const existingColumns = columns.map(col => col.column_name);
    const debug = { existingColumns };

    // Verificar se precisamos adicionar as novas colunas
    if (!existingColumns.includes('invite_token')) {
      await sqlVercel`
        ALTER TABLE users
        ADD COLUMN invite_token UUID,
        ADD COLUMN invite_expires_at TIMESTAMP WITH TIME ZONE
      `;
      debug.addedColumns = ['invite_token', 'invite_expires_at'];
    }

    res.json({
      success: true,
      tableStructure: columns,
      debug
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error checking/updating users table',
      details: error.message
    });
  }
});

// Endpoint para testar envio de email
app.get('/api/debug/test-email', async (req, res) => {
  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ error: 'Missing ?to=EMAIL parameter' });
  }
  try {
    const result = await resend.emails.send({
      from: 'Camp Management <noreply@infolio.pt>',
      to,
      subject: 'Teste de envio de email (Resend)',
      html: `<h1>Teste de envio de email</h1><p>Se você recebeu este email, o Resend está funcionando!</p>`
    });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar email', details: error.message });
  }
});

// Get camper's snack bar balance
app.get('/api/snackbar-balance/:camperId', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { camperId } = req.params;

    // First, verify the camper exists and belongs to the team
    const camperCheck = await sqlVercel`
      SELECT c.id, c.registration_id
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE c.id = ${camperId}::uuid
      AND camp.team_id = ${teamId}::uuid
    `;

    if (camperCheck.length === 0) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }

    const registrationId = camperCheck[0].registration_id;

    // Calculate total balance from snackbar_balance table
    const depositResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}::uuid
    `;

    // Calculate total spent from snack_bar_transactions table
    const spentResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camperId}::uuid
    `;

    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);

    // Calculate current balance
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
app.get('/api/snackbar-transactions/:camperId', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { camperId } = req.params;

    // Get transactions with team verification
    const result = await sqlVercel`
      SELECT 
        t.id,
        t.camper_id,
        t.amount,
        t.created_at,
        c.name as camper_name
      FROM snack_bar_transactions t
      JOIN campers c ON t.camper_id = c.id
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE t.camper_id = ${camperId}::uuid
      AND camp.team_id = ${teamId}::uuid
      ORDER BY t.created_at DESC
    `;

    return res.json(result.map(t => ({
      id: t.id,
      camper_id: t.camper_id,
      amount: Number(t.amount),
      created_at: t.created_at,
      camper: {
        id: t.camper_id,
        name: t.camper_name
      }
    })));
  } catch (error) {
    console.error('Error getting snack bar transactions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create snack bar transaction (deduct balance)
app.post('/api/snackbar-transactions', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { camper_id, amount } = req.body;

    if (!camper_id || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: camper_id and amount' });
    }

    // Verify if camper belongs to the team and get registration_id
    const camperResult = await sqlVercel`
      SELECT c.id, c.registration_id
      FROM campers c
      JOIN registrations r ON c.registration_id = r.id
      JOIN camps camp ON r.camp_id = camp.id
      WHERE c.id = ${camper_id}::uuid
      AND camp.team_id = ${teamId}::uuid
    `;

    if (camperResult.length === 0) {
      return res.status(404).json({ error: 'Camper not found or does not belong to your team' });
    }

    const registrationId = camperResult[0].registration_id;

    // Calculate current balance from snackbar_balance and snack_bar_transactions tables
    const depositResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}::uuid
    `;

    const spentResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM snack_bar_transactions
      WHERE camper_id = ${camper_id}::uuid
    `;

    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const totalSpent = Number(spentResult[0]?.total_spent || 0);
    const currentBalance = totalDeposit - totalSpent;
    const newBalance = currentBalance - Number(amount);

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create transaction
    const result = await sqlVercel`
      INSERT INTO snack_bar_transactions (camper_id, amount, created_at, updated_at)
      VALUES (${camper_id}::uuid, ${amount}, NOW(), NOW())
      RETURNING id, camper_id, amount, created_at
    `;

    return res.json({
      id: result[0].id,
      camper_id: result[0].camper_id,
      amount: Number(result[0].amount),
      created_at: result[0].created_at,
      current_balance: newBalance
    });
  } catch (error) {
    console.error('Error creating snack bar transaction:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Get all transactions for a camp
app.get('/api/snackbar-transactions', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }

  try {
    const { camp_id } = req.query;

    if (!camp_id) {
      return res.status(400).json({ error: 'Missing camp_id query parameter' });
    }

    // First check if the camp exists and belongs to the team
    const campCheck = await sqlVercel`
      SELECT id 
      FROM camps 
      WHERE id = ${camp_id}::uuid 
      AND team_id = ${teamId}::uuid
    `;

    if (campCheck.length === 0) {
      return res.status(404).json({ 
        error: 'Camp not found or does not belong to your team',
        camp_id,
        team_id: teamId
      });
    }

    // Check if the snack_bar_transactions table exists
    const tableCheck = await sqlVercel`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'snack_bar_transactions'
      ) as exists
    `;

    const tableExists = tableCheck[0]?.exists;

    // If table doesn't exist, return empty array
    if (!tableExists) {
      console.warn('snack_bar_transactions table does not exist');
      return res.json([]);
    }

    // Get all transactions for the camp with team verification
    // Use a simpler query that's less likely to fail
    try {
      const result = await sqlVercel`
        SELECT 
          t.id,
          t.camper_id,
          t.amount,
          t.created_at,
          c.name as camper_name,
          r.id as registration_id,
          c.id as camper_id,
          r.camp_id
        FROM snack_bar_transactions t
        JOIN campers c ON t.camper_id = c.id
        JOIN registrations r ON c.registration_id = r.id
        WHERE r.camp_id = ${camp_id}::uuid
        ORDER BY t.created_at DESC
      `;

      // If join query fails, try a direct query
      if (!result || result.length === 0) {
        // For logging only
        const directTransactions = await sqlVercel`
          SELECT COUNT(*) FROM snack_bar_transactions
        `;
        console.log(`No transactions found with join. Total transactions: ${directTransactions[0]?.count || 0}`);
      }

      // Map the results to the expected format
      const mappedResults = result.map(t => ({
        id: t.id,
        camper_id: t.camper_id,
        amount: Number(t.amount),
        created_at: t.created_at,
        camper: {
          id: t.camper_id,
          name: t.camper_name,
          registration: {
            id: t.registration_id,
            camp_id: t.camp_id
          }
        }
      }));

      return res.json(mappedResults);
    } catch (queryError) {
      console.error('Error in snackbar transactions query:', queryError);
      
      // Try a fallback query
      try {
        const fallbackResult = await sqlVercel`
          SELECT t.*
          FROM snack_bar_transactions t
        `;
        
        // Return basic data if we can't get the full joined data
        return res.json(fallbackResult.map(t => ({
          id: t.id,
          camper_id: t.camper_id,
          amount: Number(t.amount),
          created_at: t.created_at
        })));
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw queryError; // Throw original error for complete error details
      }
    }
  } catch (error) {
    console.error('Error getting snack bar transactions:', error);
    return res.status(500).json({ 
      error: 'Error fetching transactions', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current camp (padronizado)
app.get('/api/camps/current', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date().toISOString();
    
    // First, verify that we can find the team
    const teamExists = await sqlVercel`
      SELECT id FROM teams WHERE id = ${teamId}::uuid LIMIT 1
    `;
    
    if (teamExists.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Now get the current camp with proper date casting
    const result = await sqlVercel`
      SELECT *
      FROM camps
      WHERE team_id = ${teamId}::uuid
        AND start_date::timestamp <= ${now}::timestamp
        AND end_date::timestamp >= ${now}::timestamp
      ORDER BY start_date DESC
      LIMIT 1
    `;
    
    if (!result[0]) {
      // If no current camp, return the most recent one
      const mostRecent = await sqlVercel`
        SELECT *
        FROM camps
        WHERE team_id = ${teamId}::uuid
        ORDER BY start_date DESC
        LIMIT 1
      `;
      
      if (mostRecent.length === 0) {
        return res.json(null);
      }
      
      return res.json(mostRecent[0]);
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error in /api/camps/current:', error);
    debugLog('Error in /api/camps/current', { 
      error: error.message, 
      stack: error.stack,
      teamId 
    });
    return res.status(500).json({ 
      error: 'Error fetching current camp', 
      details: error.message
    });
  }
});

// Debug endpoint for camps
app.get('/api/debug/camps', async (req, res) => {
  try {
    const teamId = req.query.teamId;
    
    // Get all camps for diagnostics
    const allCamps = await sqlVercel`
      SELECT 
        id, 
        name, 
        team_id,
        start_date, 
        end_date, 
        created_at,
        updated_at
      FROM camps
      ${teamId ? sqlVercel`WHERE team_id = ${teamId}::uuid` : sqlVercel``}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    // Get current date in server timezone
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Check if any camps are current according to date
    const currentCamps = allCamps.filter(camp => {
      const startDate = new Date(camp.start_date);
      const endDate = new Date(camp.end_date);
      return startDate <= now && endDate >= now;
    });
    
    return res.json({
      server_time: {
        js_date: now.toString(),
        iso_date: nowIso,
        timestamp: now.getTime()
      },
      camps_found: allCamps.length,
      current_camps_count: currentCamps.length,
      current_camps: currentCamps,
      all_camps: allCamps
    });
  } catch (error) {
    console.error('Error in debug camps endpoint:', error);
    return res.status(500).json({ 
      error: 'Error getting camps debug info', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Simple diagnostic endpoint for team ID
app.get('/api/debug/team-id', async (req, res) => {
  try {
    const teamId = getTeamId(req);
    const headers = {
      'x-team-id': req.headers['x-team-id'],
      'authorization': req.headers.authorization ? 'Bearer [redacted]' : undefined
    };
    
    return res.json({
      teamId,
      headers,
      hasTeamId: !!teamId,
      source: teamId ? (
        req.headers['x-team-id'] ? 'header' : 
        req.query.teamId ? 'query' : 
        'token'
      ) : 'none'
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error checking team ID', 
      details: error.message 
    });
  }
});

// Debug endpoint for snackbar transactions
app.get('/api/debug/snackbar-transactions', async (req, res) => {
  try {
    const teamId = req.query.teamId;
    const campId = req.query.campId;
    
    // Check for table existence
    const tableCheck = await sqlVercel`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'snack_bar_transactions'
      ) as exists
    `;
    
    const tableExists = tableCheck[0]?.exists || false;
    
    if (!tableExists) {
      // Try to create the table if it doesn't exist
      try {
        await sqlVercel`
          CREATE TABLE IF NOT EXISTS public.snack_bar_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            camper_id UUID NOT NULL,
            amount NUMERIC NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
        
        return res.json({
          status: 'table_created',
          message: 'The snack_bar_transactions table was created successfully'
        });
      } catch (createError) {
        return res.status(500).json({
          status: 'table_creation_failed',
          error: 'Failed to create snack_bar_transactions table',
          details: createError.message
        });
      }
    }
    
    // Get all tables for reference
    const allTables = await sqlVercel`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    // Get table schema
    const tableSchema = await sqlVercel`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'snack_bar_transactions'
      ORDER BY ordinal_position
    `;
    
    // Check transaction count
    const transactionCount = await sqlVercel`
      SELECT COUNT(*) as count
      FROM snack_bar_transactions
    `;
    
    // Sample transactions
    let sampleTransactions = [];
    if (teamId || campId) {
      // If campId is provided, use it for filtering
      if (campId) {
        sampleTransactions = await sqlVercel`
          SELECT 
            t.id,
            t.camper_id,
            t.amount,
            t.created_at,
            c.name as camper_name,
            r.id as registration_id,
            camp.id as camp_id,
            camp.name as camp_name
          FROM snack_bar_transactions t
          JOIN campers c ON t.camper_id = c.id
          JOIN registrations r ON c.registration_id = r.id
          JOIN camps camp ON r.camp_id = camp.id
          WHERE camp.id = ${campId}::uuid
          ORDER BY t.created_at DESC
          LIMIT 10
        `;
      } 
      // If only teamId is provided, use it for filtering
      else if (teamId) {
        sampleTransactions = await sqlVercel`
          SELECT 
            t.id,
            t.camper_id,
            t.amount,
            t.created_at,
            c.name as camper_name,
            r.id as registration_id,
            camp.id as camp_id,
            camp.name as camp_name
          FROM snack_bar_transactions t
          JOIN campers c ON t.camper_id = c.id
          JOIN registrations r ON c.registration_id = r.id
          JOIN camps camp ON r.camp_id = camp.id
          WHERE camp.team_id = ${teamId}::uuid
          ORDER BY t.created_at DESC
          LIMIT 10
        `;
      }
    } else {
      // Just get some sample transactions if no filters
      sampleTransactions = await sqlVercel`
        SELECT * FROM snack_bar_transactions
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }
    
    return res.json({
      status: 'success',
      table_exists: tableExists,
      all_tables: allTables.map(t => t.table_name),
      table_schema: tableSchema,
      transaction_count: transactionCount[0]?.count || 0,
      sample_transactions: sampleTransactions
    });
  } catch (error) {
    console.error('Error in debug snackbar transactions endpoint:', error);
    return res.status(500).json({ 
      error: 'Error getting snackbar transactions debug info', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Backward compatibility endpoint (without /api prefix)
app.get('/snackbar-transactions', async (req, res) => {
  try {
    const { camp_id } = req.query;
    
    if (!camp_id) {
      return res.status(400).json({ error: 'Missing camp_id query parameter' });
    }
    
    // Extract team ID
    const teamId = getTeamId(req);
    if (!teamId) {
      return res.status(401).json({ error: 'Missing x-team-id header' });
    }

    // Check if the camp exists and belongs to the team
    const campCheck = await sqlVercel`
      SELECT id 
      FROM camps 
      WHERE id = ${camp_id}::uuid 
      AND team_id = ${teamId}::uuid
    `;

    if (campCheck.length === 0) {
      return res.status(404).json({ error: 'Camp not found or does not belong to your team' });
    }
    
    // Attempt to get transactions using a simple query
    try {
      const result = await sqlVercel`
        SELECT 
          t.id,
          t.camper_id,
          t.amount,
          t.created_at,
          c.name as camper_name,
          r.id as registration_id,
          r.camp_id
        FROM snack_bar_transactions t
        JOIN campers c ON t.camper_id = c.id
        JOIN registrations r ON c.registration_id = r.id
        WHERE r.camp_id = ${camp_id}::uuid
        ORDER BY t.created_at DESC
      `;

      // Format the response in the expected structure
      return res.json(result.map(t => ({
        id: t.id,
        camper_id: t.camper_id,
        amount: Number(t.amount),
        created_at: t.created_at,
        camper: {
          id: t.camper_id,
          name: t.camper_name,
          registration: {
            id: t.registration_id,
            camp_id: t.camp_id
          }
        }
      })));
    } catch (queryError) {
      // If the query fails, return an empty array
      console.error('Error in snackbar transactions query:', queryError);
      return res.json([]);
    }
  } catch (error) {
    console.error('Error in /snackbar-transactions endpoint:', error);
    return res.status(500).json({ error: 'Erro ao buscar as transações.' });
  }
});

// HTML debug page for snackbar transactions
app.get('/debug/snackbar-page', async (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Snackbar Transactions Debug</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
        button { padding: 10px; margin: 5px; cursor: pointer; }
        input { padding: 8px; margin: 5px; width: 300px; }
        .result { margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Snackbar Transactions Debug</h1>
      
      <div>
        <label for="teamId">Team ID:</label>
        <input type="text" id="teamId" placeholder="Team ID" value="${req.query.teamId || ''}">
      </div>
      
      <div>
        <label for="campId">Camp ID:</label>
        <input type="text" id="campId" placeholder="Camp ID" value="${req.query.campId || ''}">
      </div>
      
      <button onclick="testEndpoint('/api/snackbar-transactions')">Test /api/snackbar-transactions</button>
      <button onclick="testEndpoint('/snackbar-transactions')">Test /snackbar-transactions</button>
      <button onclick="testEndpoint('/api/debug/snackbar-transactions')">Test Debug Endpoint</button>
      <button onclick="testEndpoint('/api/debug/team-id')">Test Team ID</button>
      
      <div class="result">
        <h3>Result:</h3>
        <pre id="result">Click a button to test an endpoint</pre>
      </div>
      
      <script>
        async function testEndpoint(endpoint) {
          const resultElement = document.getElementById('result');
          const teamId = document.getElementById('teamId').value;
          const campId = document.getElementById('campId').value;
          
          resultElement.textContent = 'Loading...';
          
          try {
            let url = endpoint;
            
            // Add query parameters if needed
            if (endpoint.includes('snackbar-transactions')) {
              url += '?camp_id=' + encodeURIComponent(campId);
            } else if (endpoint.includes('debug')) {
              // For debug endpoints, add both team and camp IDs if available
              const params = [];
              if (teamId) params.push('teamId=' + encodeURIComponent(teamId));
              if (campId) params.push('campId=' + encodeURIComponent(campId));
              if (params.length > 0) {
                url += '?' + params.join('&');
              }
            }
            
            const headers = {};
            if (teamId) {
              headers['x-team-id'] = teamId;
            }
            
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            resultElement.textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            resultElement.textContent = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Debug endpoint para o balanço do snackbar
app.get('/api/debug/snackbar-balance/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    if (!registrationId) {
      return res.status(400).json({ error: 'Registration ID is required' });
    }
    
    // Verificar se a tabela snackbar_balance existe
    const tableCheckResult = await sqlVercel`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'snackbar_balance'
      ) as exists
    `;
    
    const tableExists = tableCheckResult[0]?.exists;
    
    if (!tableExists) {
      return res.status(500).json({ 
        error: 'Table snackbar_balance does not exist',
        solution: 'You may need to create the table first' 
      });
    }
    
    // Obter detalhes do registro
    const registration = await sqlVercel`
      SELECT r.id, r.name, r.snack_bar_balance, c.name as camp_name
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${registrationId}::uuid
    `;
    
    if (registration.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // Obter saldo da tabela snackbar_balance
    const depositResult = await sqlVercel`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}::uuid
    `;
    
    // Obter os campers associados a este registration
    const campers = await sqlVercel`
      SELECT id, name
      FROM campers
      WHERE registration_id = ${registrationId}::uuid
    `;
    
    // Calcular saldo gasto em transações, se houver campers
    let totalSpent = 0;
    let transactions = [];
    
    if (campers.length > 0) {
      // Extrair IDs dos campers
      const camperIds = campers.map(c => c.id);
      
      // Obter transações
      const spentResult = await sqlVercel`
        SELECT camper_id, COALESCE(SUM(amount), 0) as total_spent
        FROM snack_bar_transactions
        WHERE camper_id = ANY(${camperIds}::uuid[])
        GROUP BY camper_id
      `;
      
      // Calcular total gasto
      spentResult.forEach(item => {
        totalSpent += Number(item.total_spent || 0);
      });
      
      // Obter últimas transações
      transactions = await sqlVercel`
        SELECT *
        FROM snack_bar_transactions
        WHERE camper_id = ANY(${camperIds}::uuid[])
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }
    
    // Obter os últimos 10 depósitos
    const recentDeposits = await sqlVercel`
      SELECT id, registration_id, amount, payment_method, phone_number, created_at
      FROM snackbar_balance
      WHERE registration_id = ${registrationId}::uuid
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
    const calculatedBalance = totalDeposit - totalSpent;
    const oldBalance = Number(registration[0]?.snack_bar_balance || 0);
    
    // Retornar informações detalhadas para debug
    return res.json({
      registration: registration[0],
      campers: campers,
      balance: {
        calculated_balance: calculatedBalance,
        old_balance_field: oldBalance,
        total_deposit: totalDeposit,
        total_spent: totalSpent,
        difference: calculatedBalance - oldBalance
      },
      recent_deposits: recentDeposits,
      recent_transactions: transactions
    });
  } catch (error) {
    console.error('Error in snackbar balance debug endpoint:', error);
    return res.status(500).json({ 
      error: 'Error getting snackbar balance debug info', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Página HTML de debug para snackbar balance
app.get('/debug/snackbar-balance', async (req, res) => {
  const registrationId = req.query.id || '';

  let debugData = null;
  let error = null;

  if (registrationId) {
    try {
      // Obter detalhes do registro
      const registration = await sqlVercel`
        SELECT r.id, r.name, r.snack_bar_balance, c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE r.id = ${registrationId}::uuid
      `;
      
      if (registration.length === 0) {
        error = `Registration not found with ID: ${registrationId}`;
      } else {
        // Obter saldo da tabela snackbar_balance
        const depositResult = await sqlVercel`
          SELECT COALESCE(SUM(amount), 0) as total_deposit
          FROM snackbar_balance
          WHERE registration_id = ${registrationId}::uuid
        `;
        
        // Obter os campers associados a este registration
        const campers = await sqlVercel`
          SELECT id, name
          FROM campers
          WHERE registration_id = ${registrationId}::uuid
        `;
        
        // Calcular saldo gasto em transações, se houver campers
        let totalSpent = 0;
        let transactions = [];
        
        if (campers.length > 0) {
          // Extrair IDs dos campers
          const camperIds = campers.map(c => c.id);
          
          // Obter transações
          const spentResult = await sqlVercel`
            SELECT camper_id, COALESCE(SUM(amount), 0) as total_spent
            FROM snack_bar_transactions
            WHERE camper_id = ANY(${camperIds}::uuid[])
            GROUP BY camper_id
          `;
          
          // Calcular total gasto
          spentResult.forEach(item => {
            totalSpent += Number(item.total_spent || 0);
          });
          
          // Obter últimas transações
          transactions = await sqlVercel`
            SELECT *
            FROM snack_bar_transactions
            WHERE camper_id = ANY(${camperIds}::uuid[])
            ORDER BY created_at DESC
            LIMIT 10
          `;
        }
        
        // Obter os últimos 10 depósitos
        const recentDeposits = await sqlVercel`
          SELECT id, registration_id, amount, payment_method, phone_number, created_at
          FROM snackbar_balance
          WHERE registration_id = ${registrationId}::uuid
          ORDER BY created_at DESC
          LIMIT 10
        `;
        
        const totalDeposit = Number(depositResult[0]?.total_deposit || 0);
        const calculatedBalance = totalDeposit - totalSpent;
        const oldBalance = Number(registration[0]?.snack_bar_balance || 0);
        
        debugData = {
          registration: registration[0],
          campers: campers,
          balance: {
            calculated_balance: calculatedBalance,
            old_balance_field: oldBalance,
            total_deposit: totalDeposit,
            total_spent: totalSpent,
            difference: calculatedBalance - oldBalance
          },
          recent_deposits: recentDeposits,
          recent_transactions: transactions
        };
      }
    } catch (e) {
      error = e.message;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Snackbar Balance Debug</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
        .error { color: red; }
        .success { color: green; }
        .card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .balance { font-size: 24px; font-weight: bold; }
        .positive { color: green; }
        .negative { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Snackbar Balance Debug</h1>
      
      <div class="card">
        <form method="get">
          <label for="registrationId">Registration ID:</label>
          <input type="text" id="registrationId" name="id" value="${registrationId}" style="width: 300px; padding: 5px;">
          <button type="submit">Check Balance</button>
        </form>
      </div>
      
      ${error ? `<div class="error card"><strong>Error:</strong> ${error}</div>` : ''}
      
      ${debugData ? `
        <div class="card">
          <h2>Registration: ${debugData.registration.name}</h2>
          <p><strong>ID:</strong> ${debugData.registration.id}</p>
          <p><strong>Camp:</strong> ${debugData.registration.camp_name}</p>
          
          <div class="balance ${debugData.balance.calculated_balance >= 0 ? 'positive' : 'negative'}">
            Balance: €${debugData.balance.calculated_balance.toFixed(2)}
          </div>
          
          <div style="margin-top: 10px;">
            <p><strong>Total Deposits:</strong> €${debugData.balance.total_deposit.toFixed(2)}</p>
            <p><strong>Total Spent:</strong> €${debugData.balance.total_spent.toFixed(2)}</p>
            <p><strong>Legacy Balance Field:</strong> €${debugData.balance.old_balance_field.toFixed(2)}</p>
            <p><strong>Difference:</strong> €${debugData.balance.difference.toFixed(2)}</p>
          </div>
        </div>
        
        <div class="card">
          <h2>Associated Campers (${debugData.campers.length})</h2>
          ${debugData.campers.length > 0 ? `
            <table>
              <tr>
                <th>ID</th>
                <th>Name</th>
              </tr>
              ${debugData.campers.map(camper => `
                <tr>
                  <td>${camper.id}</td>
                  <td>${camper.name}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No campers found</p>'}
        </div>
        
        <div class="card">
          <h2>Recent Deposits (${debugData.recent_deposits.length})</h2>
          ${debugData.recent_deposits.length > 0 ? `
            <table>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Phone</th>
                <th>Date</th>
              </tr>
              ${debugData.recent_deposits.map(deposit => `
                <tr>
                  <td>${deposit.id}</td>
                  <td>€${Number(deposit.amount).toFixed(2)}</td>
                  <td>${deposit.payment_method}</td>
                  <td>${deposit.phone_number || '-'}</td>
                  <td>${new Date(deposit.created_at).toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No deposits found</p>'}
        </div>
        
        <div class="card">
          <h2>Recent Transactions (${debugData.recent_transactions.length})</h2>
          ${debugData.recent_transactions.length > 0 ? `
            <table>
              <tr>
                <th>ID</th>
                <th>Camper ID</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
              ${debugData.recent_transactions.map(transaction => `
                <tr>
                  <td>${transaction.id}</td>
                  <td>${transaction.camper_id}</td>
                  <td>€${Number(transaction.amount).toFixed(2)}</td>
                  <td>${new Date(transaction.created_at).toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No transactions found</p>'}
        </div>
      ` : ''}
    </body>
    </html>
  `;
  
  res.send(html);
});

// Endpoint para criar a tabela snackbar_balance e migrar dados existentes
app.get('/api/setup/snackbar-balance-table', async (req, res) => {
  try {
    // Verificar se a tabela já existe
    const tableCheckResult = await sqlVercel`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'snackbar_balance'
      ) as exists
    `;
    
    const tableExists = tableCheckResult[0]?.exists;
    
    if (tableExists) {
      return res.json({
        status: 'table_exists',
        message: 'A tabela snackbar_balance já existe'
      });
    }
    
    // Criar a tabela snackbar_balance
    await sqlVercel`
      CREATE TABLE IF NOT EXISTS snackbar_balance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registration_id UUID NOT NULL REFERENCES registrations(id),
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Identificar registrations com saldo positivo para migração
    const registrationsWithBalance = await sqlVercel`
      SELECT id, snack_bar_balance
      FROM registrations
      WHERE snack_bar_balance > 0
    `;
    
    const migrationResults = [];
    
    // Migrar saldos existentes para a nova tabela
    if (registrationsWithBalance.length > 0) {
      for (const reg of registrationsWithBalance) {
        const balance = Number(reg.snack_bar_balance) || 0;
        
        if (balance > 0) {
          // Inserir um registro na nova tabela para cada registro com saldo
          const insertResult = await sqlVercel`
            INSERT INTO snackbar_balance (
              registration_id,
              amount,
              payment_method,
              created_at,
              updated_at
            ) VALUES (
              ${reg.id}::uuid,
              ${balance},
              'Migração',
              NOW(),
              NOW()
            ) RETURNING id
          `;
          
          migrationResults.push({
            registration_id: reg.id,
            amount: balance,
            insert_id: insertResult[0]?.id
          });
        }
      }
    }
    
    return res.json({
      status: 'success',
      message: 'Tabela criada com sucesso',
      table_created: true,
      migrated_records: migrationResults.length,
      migration_details: migrationResults
    });
  } catch (error) {
    console.error('Erro ao configurar tabela snackbar_balance:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao configurar tabela',
      error: error.message,
      stack: error.stack
    });
  }
});

// Export the Express app as a serverless function
export default app;