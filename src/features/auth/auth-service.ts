import { sqlNeon } from '@/lib/sql-neon'
import type { SignUpCredentials } from './types'
import bcrypt from 'bcryptjs'

export type User = {
  id: string
  email: string
  name?: string
  team_id?: string | null
}

export type Session = {
  user: User
  token: string
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'

export async function signIn(email: string | { email: string, password: string }, password?: string) {
  // Handle both object and separate parameters
  const credentials = typeof email === 'object' 
    ? { email: String(email.email), password: String(email.password) }
    : { email: String(email), password: String(password) }

  // Buscar usuário pelo email
  const result = await sqlNeon`
    SELECT id, email, name, password_hash, team_id, created_at, updated_at
    FROM public.users 
    WHERE email = ${credentials.email}::text
  `

  const user = result[0]
  
  if (!user) {
    throw new Error('Invalid credentials')
  }

  // Verificar a senha
  const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash)
  
  if (!passwordMatch) {
    throw new Error('Invalid credentials')
  }

  const token = user.id

  return { 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id
    }, 
    session: { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        team_id: user.team_id
      }, 
      token 
    } 
  }
}

export async function signOut() {
  return { error: null }
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('No token found')
  }

  const result = await sqlNeon`
    SELECT id, email, name, team_id, created_at, updated_at
    FROM public.users
    WHERE id = ${token}::uuid
  `

  const user = result[0]
  
  if (!user) {
    throw new Error('User not found')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    team_id: user.team_id
  }
}

export async function getCurrentUserTeam() {
  console.log('getCurrentUserTeam called');
  
  try {
    const user = await getCurrentUser();
    console.log('getCurrentUserTeam: User retrieved:', user);
    
    if (!user.team_id) {
      console.error('getCurrentUserTeam: User has no team assigned');
      throw new Error('User has no team assigned');
    }
    
    console.log('getCurrentUserTeam: Querying for team with ID:', user.team_id);
    
    const result = await sqlNeon`
      SELECT t.id, t.name
      FROM public.teams t
      WHERE t.id = ${user.team_id}::uuid
    `;
    
    console.log('getCurrentUserTeam: Query result:', result);
    
    const team = result[0];
    
    if (!team) {
      console.error('getCurrentUserTeam: Team not found');
      throw new Error('Team not found');
    }
    
    console.log('getCurrentUserTeam: Team found:', team);
    return team;
  } catch (error) {
    console.error('getCurrentUserTeam error:', error);
    throw error;
  }
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  // In a real app, you'd set up event listeners for auth state changes
  // For now, we're not implementing real-time updates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _callback = callback; // Store callback to avoid linter error
  return () => {
    // Cleanup function
  }
}

export async function signUp({ email, password, name }: SignUpCredentials) {
  // Verificar se o usuário já existe
  const existingUserResult = await sqlNeon`
    SELECT id FROM public.users WHERE email = ${email}::text
  `
  
  if (existingUserResult.length > 0) {
    throw new Error('User with this email already exists')
  }
  
  // Gerar hash da senha
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  
  // Criar o usuário
  const result = await sqlNeon`
    INSERT INTO public.users (id, email, name, password_hash)
    VALUES (gen_random_uuid(), ${email}::text, ${name}::text, ${hashedPassword}::text)
    RETURNING id, email, name, team_id
  `
  
  const user = result[0]
  
  if (!user) {
    throw new Error('Failed to create user')
  }
  
  const token = user.id

  return { 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id
    }, 
    session: { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        team_id: user.team_id
      }, 
      token 
    } 
  }
} 