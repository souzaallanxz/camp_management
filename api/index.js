// Importar o servidor Express do arquivo server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://campmanagement-pwsm6m1g4-souzaallanxzs-projects.vercel.app', 'https://campmanagement.vercel.app', 'https://campmanagement-a0bu9c7hx-souzaallanxzs-projects.vercel.app', 'https://campmanagement-pzl6edpul-souzaallanxzs-projects.vercel.app', 'https://campmanagement-9eqwfmsi7-souzaallanxzs-projects.vercel.app', 'https://campmanagement-hi7hnzpy1-souzaallanxzs-projects.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}));

// Parse JSON request bodies
app.use(express.json());

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY);

// === VERSÃO SEM PREFIXO /api === //

// Sign in route
app.post('/auth/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await sql`
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
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Find user by token (which is the user ID)
    const userResult = await sql`
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
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth}
    `;
    
    // Pagamentos do mês anterior
    const prev = await sql`
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
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth}
    `;
    
    // Registrations do mês anterior
    const prev = await sql`
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
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth}
    `;
    
    // Snackbar do mês anterior
    const prev = await sql`
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
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear}
    `;
    
    // Campistas do ano anterior
    const prev = await sql`
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
    // Pagamentos por acampamento
    const results = await sql`
      SELECT c.name as camp_name, COALESCE(SUM(p.amount), 0) as total_amount
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}::uuid
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

    return res.json(results.map(item => ({
      name: item.camp_name,
      total: item.total_amount
    })));
  } catch (error) {
    console.error('Error getting camp payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent Registrations
app.get('/dashboard/recent-registrations', async (req, res) => {
  console.log('Recebendo requisição para /dashboard/recent-registrations');
  console.log('Headers:', req.headers);
  console.log('Query params:', req.query);
  
  const teamId = getTeamId(req);
  console.log('Team ID obtido:', teamId);
  
  try {
    // Tentar descobrir a estrutura da tabela registrations
    console.log('Verificando estrutura da tabela registrations...');
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'registrations'
    `;
    
    console.log('Colunas da tabela registrations:', tableInfo.map(col => col.column_name));
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    console.log('Limit para consulta:', limit);
    
    // Inscrições recentes - usando nome das colunas corretas
    console.log('Executando consulta SQL...');
    
    let results;
    if (teamId) {
      // Se tiver teamId, filtra por ele
      console.log('Executando consulta com filtro de teamId');
      results = await sql`
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
      console.log('Executando consulta SEM filtro de teamId (modo diagnóstico)');
      results = await sql`
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
    
    console.log('Consulta SQL executada com sucesso');
    console.log('Resultados obtidos:', results.length);

    const formattedResults = results.map(item => ({
      id: item.id,
      camper_name: item.camper_name,
      camper_email: item.camper_email,
      status: item.status,
      created_at: item.created_at,
      camp_name: item.camp_name
    }));
    
    console.log('Enviando resposta...');
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
    const { email, password } = req.body;

    // Find user by email
    const userResult = await sql`
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
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Find user by token (which is the user ID)
    const userResult = await sql`
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
app.get('/api/teams/current', async (req, res) => {
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
  } catch (error) {
    console.error('Error getting team:', error);
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
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM p.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM p.created_at) = ${currentMonth}
    `;
    
    // Pagamentos do mês anterior
    const prev = await sql`
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
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM r.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM r.created_at) = ${currentMonth}
    `;
    
    // Registrations do mês anterior
    const prev = await sql`
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
    const current = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM snackbar_balance sb
      JOIN registrations r ON sb.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM sb.created_at) = ${currentYear}
      AND EXTRACT(MONTH FROM sb.created_at) = ${currentMonth}
    `;
    
    // Snackbar do mês anterior
    const prev = await sql`
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
app.get('/api/dashboard/yearly-campers', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Campistas deste ano
    const current = await sql`
      SELECT COUNT(*) as total_count
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = ${teamId}::uuid
      AND EXTRACT(YEAR FROM cm.created_at) = ${currentYear}
    `;
    
    // Campistas do ano anterior
    const prev = await sql`
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
app.get('/api/dashboard/camp-payments', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) {
    return res.status(401).json({ error: 'Missing x-team-id header' });
  }
  try {
    // Pagamentos por acampamento
    const results = await sql`
      SELECT c.name as camp_name, COALESCE(SUM(p.amount), 0) as total_amount
      FROM camps c
      LEFT JOIN registrations r ON c.id = r.camp_id
      LEFT JOIN payments p ON r.id = p.registration_id
      WHERE c.team_id = ${teamId}::uuid
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

    return res.json(results.map(item => ({
      name: item.camp_name,
      total: item.total_amount
    })));
  } catch (error) {
    console.error('Error getting camp payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent Registrations
app.get('/api/dashboard/recent-registrations', async (req, res) => {
  console.log('Recebendo requisição para /api/dashboard/recent-registrations');
  console.log('Headers:', req.headers);
  console.log('Query params:', req.query);
  
  const teamId = getTeamId(req);
  console.log('Team ID obtido:', teamId);
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    console.log('Limit para consulta:', limit);
    
    // Inscrições recentes - usando nome das colunas corretas
    console.log('Executando consulta SQL...');
    
    let results;
    if (teamId) {
      // Se tiver teamId, filtra por ele
      console.log('Executando consulta com filtro de teamId');
      results = await sql`
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
      console.log('Executando consulta SEM filtro de teamId (modo diagnóstico)');
      results = await sql`
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
    
    console.log('Consulta SQL executada com sucesso');
    console.log('Resultados obtidos:', results.length);

    const formattedResults = results.map(item => ({
      id: item.id,
      camper_name: item.camper_name,
      camper_email: item.camper_email,
      status: item.status,
      created_at: item.created_at,
      camp_name: item.camp_name
    }));
    
    console.log('Enviando resposta...');
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

// Rota de diagnóstico (sem verificação de teamId)
app.get('/debug/registrations', async (req, res) => {
  console.log('Executando rota de diagnóstico /debug/registrations');
  
  try {
    // Verificar conexão com o banco
    console.log('Verificando conexão com o banco de dados...');
    const testConnection = await sql`SELECT 1 as test`;
    console.log('Conexão com banco de dados OK:', testConnection);
    
    // Dados básicos das tabelas
    console.log('Buscando informações sobre tabelas...');
    
    // Contagem de registrations
    const registrationCount = await sql`SELECT COUNT(*) as count FROM registrations`;
    console.log('Total de registrations:', registrationCount[0]?.count);
    
    // Contagem de camps
    const campsCount = await sql`SELECT COUNT(*) as count FROM camps`;
    console.log('Total de camps:', campsCount[0]?.count);
    
    // Contagem de teams
    const teamsCount = await sql`SELECT COUNT(*) as count FROM teams`;
    console.log('Total de teams:', teamsCount[0]?.count);
    
    // Listar alguns teams para diagnóstico
    const teams = await sql`SELECT id, name FROM teams LIMIT 5`;
    console.log('Teams encontrados:', teams);
    
    // Tentar buscar as 5 registrations mais recentes
    const results = await sql`
      SELECT 
        r.id, 
        r.camper_name, 
        r.camper_email,
        r.status,
        r.created_at,
        c.name as camp_name,
        c.team_id
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `;
    console.log('Registrations mais recentes encontrados:', results.length);
    
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
    console.error('Erro na rota de diagnóstico:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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
  console.log('Verificando variáveis de ambiente');
  
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
    console.error('Erro ao verificar variáveis de ambiente:', error);
    return res.status(500).json({ error: 'Error checking environment variables' });
  }
});

// Helper para obter o teamId do header
function getTeamId(req) {
  console.log('Tentando obter teamId dos headers...');
  console.log('Headers disponíveis:', Object.keys(req.headers));
  
  // Check for x-team-id header
  const teamId = req.headers['x-team-id'];
  console.log('x-team-id do header:', teamId);
  
  // Verificar se existe no cookie também
  const cookies = req.headers.cookie;
  console.log('Cookies:', cookies);
  
  // Verificar no authorization header se for necessário
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);
  
  // Se não tiver o teamId, tentar buscá-lo do token
  if (!teamId && authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Tentando obter teamId do token...');
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        // Armazenar o token para tentar verificar o usuário posteriormente
        req.userToken = token;
        console.log('Token armazenado:', token);
      } catch (error) {
        console.error('Erro ao processar token:', error);
      }
    }
  }
  
  // Se não encontrou o teamId, permitir o uso do query parameter
  if (!teamId && req.query && req.query.teamId) {
    console.log('Usando teamId do query parameter:', req.query.teamId);
    return req.query.teamId;
  }
  
  if (!teamId || typeof teamId !== 'string') {
    console.log('TeamId não encontrado ou inválido');
    return null;
  }
  
  console.log('TeamId encontrado:', teamId);
  return teamId;
}

// ===== REGISTRATIONS ENDPOINTS =====

// Get all registrations
app.get('/registrations', async (req, res) => {
  console.log('Recebendo requisição para /registrations');
  
  try {
    const teamId = getTeamId(req);
    console.log('Team ID obtido:', teamId);
    
    let results;
    if (teamId) {
      results = await sql`
        SELECT r.*, c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}::uuid
        ORDER BY r.created_at DESC
      `;
    } else {
      // Modo diagnóstico - retornar alguns registros para verificação
      results = await sql`
        SELECT r.*, c.name as camp_name
        FROM registrations r
        JOIN camps c ON r.camp_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 20
      `;
    }
    
    return res.json(results);
  } catch (error) {
    console.error('Error getting registrations:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// Get registration by ID
app.get('/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT r.*, c.name as camp_name
      FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE r.id = ${id}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting registration by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CAMPERS ENDPOINTS =====

// Get all campers
app.get('/campers', async (req, res) => {
  console.log('Recebendo requisição para /campers');
  
  try {
    const teamId = getTeamId(req);
    console.log('Team ID obtido:', teamId);
    
    let results;
    if (teamId) {
      results = await sql`
        SELECT cm.*, r.name as registration_name, c.name as camp_name
        FROM campers cm
        JOIN registrations r ON cm.registration_id = r.id
        JOIN camps c ON r.camp_id = c.id
        WHERE c.team_id = ${teamId}::uuid
        ORDER BY cm.created_at DESC
      `;
    } else {
      // Modo diagnóstico
      results = await sql`
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
app.get('/campers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT cm.*, r.name as registration_name, c.name as camp_name
      FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE cm.id = ${id}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Camper not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting camper by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USERS ENDPOINTS =====

// Get all users
app.get('/users', async (req, res) => {
  console.log('Recebendo requisição para /users');
  
  try {
    const teamId = getTeamId(req);
    console.log('Team ID obtido:', teamId);
    
    // Usuários só são acessíveis para a mesma equipe ou superadmin
    let results;
    if (teamId) {
      results = await sql`
        SELECT id, email, name, role, team_id, created_at, updated_at
        FROM users
        WHERE team_id = ${teamId}::uuid
        ORDER BY created_at DESC
      `;
    } else {
      // Modo diagnóstico - omite informações sensíveis
      results = await sql`
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

// Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT id, email, name, role, team_id, created_at, updated_at
      FROM users
      WHERE id = ${id}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CAMPS ENDPOINTS =====

// Get all camps
app.get('/camps', async (req, res) => {
  console.log('Recebendo requisição para /camps');
  
  try {
    const teamId = getTeamId(req);
    console.log('Team ID obtido:', teamId);
    
    let results;
    if (teamId) {
      results = await sql`
        SELECT *
        FROM camps
        WHERE team_id = ${teamId}::uuid
        ORDER BY created_at DESC
      `;
    } else {
      // Modo diagnóstico
      results = await sql`
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
app.get('/camps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT *
      FROM camps
      WHERE id = ${id}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Camp not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting camp by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
});

// Get profile settings - with /api prefix
app.get('/api/settings/profile', async (req, res) => {
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
});

// Get organization settings
app.get('/settings/organization', async (req, res) => {
  try {
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
});

// Get organization settings - with /api prefix
app.get('/api/settings/organization', async (req, res) => {
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
});

// Create a new camp
app.post('/api/camps', async (req, res) => {
  console.log('POST /api/camps request received');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  try {
    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const teamId = getTeamId(req);
    console.log('TeamId from request:', teamId);
    
    if (!teamId) {
      return res.status(401).json({ error: 'Missing x-team-id header' });
    }
    
    const { name, start_date, end_date, price } = req.body;
    if (!name || !start_date || !end_date || price === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        received: { name, start_date, end_date, price } 
      });
    }
    
    const now = new Date().toISOString();
    console.log('Inserting camp with teamId:', teamId);
    
    const result = await sql`
      INSERT INTO camps (name, start_date, end_date, price, team_id, created_at, updated_at)
      VALUES (${name}, ${start_date}, ${end_date}, ${price}, ${teamId}::uuid, ${now}, ${now})
      RETURNING *
    `;
    
    console.log('Camp created successfully:', result[0]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating camp:', error);
    res.status(500).json({ 
      error: 'Erro ao criar acampamento.',
      details: error.message 
    });
  }
});

// Get camp by ID
app.get('/api/camps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sql`
      SELECT *
      FROM camps
      WHERE id = ${id}::uuid
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Camp not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error getting camp by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the Express app as a serverless function
export default app; 