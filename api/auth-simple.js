import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Configurar dotenv
dotenv.config();

// Logging adicional para debug
console.log('Inicializando auth-simple.js');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Handler serverless padrão para Vercel
export default async function handler(req, res) {
  console.log('auth-simple.js - Recebida requisição');
  console.log('Método:', req.method);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-team-id');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Requisição OPTIONS - respondendo com 200');
    res.status(200).end();
    return;
  }

  // Verificar método
  if (req.method !== 'POST') {
    console.log('Método inválido:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Processando requisição POST para autenticação');
    
    // Parse do body
    if (!req.body) {
      console.log('Requisição sem body');
      return res.status(400).json({ error: 'Missing request body' });
    }

    console.log('Request body tipo:', typeof req.body);
    
    // Caso o body venha como string (pode acontecer na Vercel)
    let body = req.body;
    if (typeof req.body === 'string') {
      try {
        console.log('Tentando fazer parse do body como string');
        body = JSON.parse(req.body);
      } catch (parseError) {
        console.error('Erro ao fazer parse do body:', parseError);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    }

    const email = body.email;
    const password = body.password;

    console.log('Email recebido:', email ? 'preenchido' : 'vazio');
    console.log('Senha recebida:', password ? 'preenchida' : 'vazia');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Conectando ao banco de dados...');

    // Find user by email
    console.log('Executando consulta SQL para buscar usuário:', email);
    const userResult = await sql`
      SELECT id, email, name, password_hash, team_id 
      FROM public.users 
      WHERE email = ${email}
    `;

    console.log('Resultado da consulta:', userResult ? `${userResult.length} resultados` : 'nenhum resultado');
    
    const user = userResult[0];

    if (!user) {
      console.log('Usuário não encontrado');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Verificando senha para usuário:', user.email);

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('Senha inválida');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Autenticação bem-sucedida para:', user.email);

    // Remove password_hash from response
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password_hash;

    console.log('Enviando resposta de sucesso');
    return res.status(200).json({
      user: userWithoutPassword,
      session: {
        user: userWithoutPassword,
        token: user.id // Using user ID as token for now
      }
    });
  } catch (error) {
    console.error('Erro detalhado na autenticação:', error);
    console.error('Mensagem de erro:', error.message);
    console.error('Stack de erro:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      database_url_set: !!process.env.DATABASE_URL 
    });
  }
} 