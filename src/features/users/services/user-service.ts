import { User } from '../data/schema'

// Get API URL from environment with proper handling for production vs development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Check if we're in production environment (campmanagement.vercel.app)
const isProduction = API_URL.includes('campmanagement.vercel.app');

// In production, the API endpoints don't have /api prefix
const API_BASE_URL = isProduction ? API_URL : (API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`);

// Common headers for caching prevention
const getCacheHeaders = () => ({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

// Busca apenas usuários da equipe atual do usuário logado
export async function getUsers(): Promise<User[]> {
  try {
    const headers = { 
      'Content-Type': 'application/json', 
      ...getTeamIdHeader(),
      ...getCacheHeaders()
    };
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${API_BASE_URL}/users?_=${timestamp}`;
    
    const response = await fetch(url, {
      headers,
      credentials: 'include',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    });
    
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

// Função unificada para criar/convidar usuários
export async function createUserWithInvitation(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'username' | 'phoneNumber'>): Promise<User> {
  try {
    const headers = { 
      'Content-Type': 'application/json', 
      ...getTeamIdHeader(),
      ...getCacheHeaders()
    };
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${API_BASE_URL}/users?_=${timestamp}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) throw new Error('Erro ao criar usuário');
    return response.json();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erro ao criar usuário');
  }
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
  try {
    const headers = { 
      'Content-Type': 'application/json', 
      ...getTeamIdHeader(),
      ...getCacheHeaders()
    };
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${API_BASE_URL}/users/${userId}?_=${timestamp}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar usuário');
    return response.json();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erro ao atualizar usuário');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const headers = { 
      ...getTeamIdHeader(),
      ...getCacheHeaders()
    };
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${API_BASE_URL}/users/${userId}?_=${timestamp}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Erro ao deletar usuário');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erro ao deletar usuário');
  }
} 