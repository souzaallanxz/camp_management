import type { Camp, InsertCamp, UpdateCamp } from '../data/schema'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

export const campService = {
  async findAll() {
    const response = await fetch(`${API_BASE_URL}/camps`, {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar acampamentos');
    return response.json();
  },

  async findById(id: string) {
    const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar acampamento');
    return response.json();
  },

  async create(camp: InsertCamp) {
    const response = await fetch(`${API_BASE_URL}/camps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(camp),
    });
    if (!response.ok) throw new Error('Erro ao criar acampamento');
    return response.json();
  },

  async update(id: string, camp: UpdateCamp) {
    const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(camp),
    });
    if (!response.ok) throw new Error('Erro ao atualizar acampamento');
    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
      method: 'DELETE',
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao deletar acampamento');
  }
}

export async function getCamps() {
  const response = await fetch(`${API_BASE_URL}/camps`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
}

export async function getCampById(id: string): Promise<Camp> {
  const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar acampamento');
  return response.json();
} 