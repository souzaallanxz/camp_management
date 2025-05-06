import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

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

// Export the Express API
export default app; 