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
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}));

// Parse JSON request bodies
app.use(express.json());

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY);

// === AUTH ROUTES === //

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

// Sign up route
app.post('/auth/sign-up', async (req, res) => {
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
      INSERT INTO public.users (id, email, name, password_hash)
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword})
      RETURNING id, email, name, team_id
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user route
app.get('/auth/me', async (req, res) => {
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

// Forgot password route
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const userResult = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `;

    if (userResult.length === 0) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({ success: true });
    }

    const user = userResult[0];

    // Generate reset token (using a simple UUID for now)
    const resetToken = crypto.randomUUID();

    // Store reset token in database
    await sql`
      UPDATE public.users 
      SET password_reset_token = ${resetToken}, 
          password_reset_expires = NOW() + INTERVAL '1 hour'
      WHERE id = ${user.id}
    `;

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Check if Resend API key is configured
    if (!process.env.VITE_RESEND_API_KEY && !process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' });
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
    });

    if (result.error) {
      return res.status(500).json({ error: 'Failed to send password reset email', details: result.error });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Reset password route
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const userResult = await sql`
      SELECT id 
      FROM public.users 
      WHERE password_reset_token = ${token} 
      AND password_reset_expires > NOW()
    `;

    if (userResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = userResult[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await sql`
      UPDATE public.users 
      SET password_hash = ${hashedPassword}, 
          password_reset_token = NULL, 
          password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in reset password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === TEAMS ROUTES === //

// Get current user's team
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
    console.error('Error in get current team:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === DASHBOARD ROUTES === //

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
    console.error('Error in monthly payments:', error);
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
      current: parseInt(current[0]?.total_count || '0'),
      previous: parseInt(prev[0]?.total_count || '0')
    });
  } catch (error) {
    console.error('Error in monthly registrations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get team ID from request headers
function getTeamId(req) {
  const teamId = req.headers['x-team-id'];
  if (!teamId) return null;
  return teamId;
}

// Export the Express app as a serverless function
export default app; 