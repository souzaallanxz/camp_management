import type { Camp, InsertCamp, UpdateCamp } from '../data/schema'
import { buildApiUrl, fetchWithNoCache } from '@/services/api'

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) {
    console.error('teamId not found in localStorage');
    // Check if we can get team ID from user data
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication data found. Please login again.');
    }
    throw new Error('No team ID found. Please refresh the page or login again.');
  }
  return { 'x-team-id': teamId };
}

export const campService = {
  async findAll() {
    const response = await fetchWithNoCache(buildApiUrl('/camps'), {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao buscar acampamentos');
    return response.json();
  },

  async findById(id: string) {
    const response = await fetchWithNoCache(buildApiUrl(`/camps/${id}`), {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao buscar acampamento');
    return response.json();
  },

  async create(camp: InsertCamp) {
    // Log teamId for debugging
    console.log('Creating camp with teamId:', localStorage.getItem('teamId'));
    
    const response = await fetchWithNoCache(buildApiUrl('/camps'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        ...getTeamIdHeader(),
        // Add debug header
        'X-Debug-Info': `teamId=${localStorage.getItem('teamId')}`
      },
      credentials: 'include',
      body: JSON.stringify(camp)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error creating camp:', error);
      throw new Error(`Erro ao criar acampamento: ${error}`);
    }
    
    return response.json();
  },

  async update(id: string, camp: UpdateCamp) {
    const response = await fetchWithNoCache(buildApiUrl(`/camps/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(camp)
    });
    if (!response.ok) throw new Error('Erro ao atualizar acampamento');
    return response.json();
  },

  async delete(id: string) {
    const response = await fetchWithNoCache(buildApiUrl(`/camps/${id}`), {
      method: 'DELETE',
      headers: { ...getTeamIdHeader() },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao deletar acampamento');
  }
}

export async function getCamps() {
  const response = await fetchWithNoCache(buildApiUrl('/camps'), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include'
  });
  if (!response.ok) return [];
  return response.json();
}

export async function getCampById(id: string): Promise<Camp> {
  const response = await fetchWithNoCache(buildApiUrl(`/camps/${id}`), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Erro ao buscar acampamento');
  return response.json();
} 