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
  try {
    const user = await getCurrentUser();
    
    if (!user.team_id) {
      // Return null if user has no team_id, don't throw an error
      return null;
    }
    
    // Just return the team_id directly as that's what the user service expects
    return user.team_id;
  } catch {
    // Return null instead of throwing an error
    return null;
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

// Nova função para ajudar a debugar o ID do time
export async function logCurrentUserTeamId() {
  try {
    const user = await getCurrentUser();
    const team_id = user.team_id;
    
    // Log do ID do time no console para facilitar debug
    console.log('='.repeat(50));
    console.log('ID do time do usuário atual:', team_id);
    console.log(`Para testar com esse team_id use: ${window.location.origin}/users?team_id=${team_id}`);
    console.log('='.repeat(50));
    
    return team_id;
  } catch {
    console.log('Não foi possível obter o ID do time do usuário');
    return null;
  }
} 