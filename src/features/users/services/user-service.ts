import { User } from '../data/schema'
import { buildApiUrl } from '@/services/api'

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

// Busca apenas usuários da equipe atual do usuário logado
export async function getUsers(): Promise<User[]> {
  const response = await fetch(buildApiUrl('/users'), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
}

// Função unificada para criar/convidar usuários
export async function createUserWithInvitation(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'username' | 'phoneNumber'>): Promise<User> {
  const response = await fetch(buildApiUrl('/users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Erro ao criar usuário');
  return response.json();
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
  const response = await fetch(buildApiUrl(`/users/${userId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Erro ao atualizar usuário');
  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(buildApiUrl(`/users/${userId}`), {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar usuário');
} 