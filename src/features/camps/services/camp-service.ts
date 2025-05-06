import type { Camp, InsertCamp, UpdateCamp } from '../data/schema'
import { api, API_PATHS } from '@/services/api'

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
  async getCamps() {
    try {
      return await api.get<Camp[]>(API_PATHS.CAMPS);
    } catch {
      return [];
    }
  },

  async getCamp(id: string) {
    try {
      return await api.get<Camp>(API_PATHS.CAMP(id));
    } catch {
      return null;
    }
  },

  async createCamp(data: InsertCamp) {
    try {
      return await api.post<Camp>(API_PATHS.CAMPS, data);
    } catch {
      throw new Error('Failed to create camp');
    }
  },

  async updateCamp(id: string, data: UpdateCamp) {
    try {
      return await api.put<Camp>(API_PATHS.CAMP(id), data);
    } catch {
      throw new Error('Failed to update camp');
    }
  },

  async deleteCamp(id: string) {
    try {
      await api.delete(API_PATHS.CAMP(id));
    } catch {
      throw new Error('Failed to delete camp');
    }
  }
};

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