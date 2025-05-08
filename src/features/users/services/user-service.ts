import { User } from '../data/schema'

// For production, directly use the correct API URL
const API_BASE_URL = 'https://campmanagement.vercel.app/api'

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  const token = localStorage.getItem('token');
  if (!teamId) throw new Error('No team ID found');
  if (!token) throw new Error('No authenticated user found');
  return { 
    'x-team-id': teamId,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Busca apenas usuários da equipe atual do usuário logado
export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
}

// Função unificada para criar/convidar usuários
export async function createUserWithInvitation(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'username' | 'phoneNumber'>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Erro ao criar usuário');
  return response.json();
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar usuário');
  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar usuário');
} 