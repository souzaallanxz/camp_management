import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();

// Logging para debug
console.log('Environment:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://campmanagement.vercel.app', 'https://shadcn-admin.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id']
}));

// Parse JSON request bodies
app.use(express.json());

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Sign in route
app.post('/', async (req, res) => {
  try {
    console.log('Recebendo requisição para autenticação');
    console.log('Request body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      console.error('Requisição inválida, body não é um objeto:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.error('Email ou senha não fornecidos');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Buscando usuário pelo email:', email);
    
    // Find user by email
    let userResult;
    try {
      userResult = await sql`
        SELECT id, email, name, password_hash, team_id 
        FROM public.users 
        WHERE email = ${email}
      `;
      console.log('Resultado da consulta do usuário:', userResult ? 'encontrado' : 'não encontrado');
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
      console.log('Usuário não encontrado');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Verificando senha');
    
    // Verify password
    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('Erro ao verificar senha:', bcryptError);
      return res.status(500).json({ error: 'Password verification error' });
    }

    if (!isPasswordValid) {
      console.log('Senha inválida');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Autenticação bem-sucedida');
    
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
    console.error('Error in sign-in - DETALHADO:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL 
    });
  }
});

// Export the Express app as a serverless function
export default app; 