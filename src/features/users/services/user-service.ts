import { User } from '../data/schema'

// Usar o mesmo padrão de URL que funciona no dashboard
const API_BASE_URL = 'https://campmanagement.vercel.app';

function getTeamIdHeader() {
  // Usar o mesmo nome de chave que o dashboard usa, que sabemos que está funcionando
  const teamId = localStorage.getItem('team_id');
  if (!teamId) return {};
  return { 'x-team-id': teamId };
}

// Busca apenas usuários da equipe atual do usuário logado
export async function getUsers(): Promise<User[]> {
  try {
    const headers = { 
      'Content-Type': 'application/json', 
      ...getTeamIdHeader()
    };
    
    // Usar o mesmo formato de URL que funciona no dashboard
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers,
      method: 'GET',
      credentials: 'include'
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
      ...getTeamIdHeader()
    };
    
    const response = await fetch(`${API_BASE_URL}/users`, {
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
      ...getTeamIdHeader()
    };
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
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
      ...getTeamIdHeader()
    };
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Erro ao deletar usuário');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erro ao deletar usuário');
  }
} 