import type { InsertCamper } from '../data/schema'
import { buildApiUrl, fetchWithNoCache } from '@/services/api'

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

async function findAll() {
  const response = await fetchWithNoCache(buildApiUrl('/campers'), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar campistas');
  return response.json();
}

async function findById(id: string) {
  const response = await fetchWithNoCache(buildApiUrl(`/campers/${id}`), {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar campista');
  return response.json();
}

async function create(camper: InsertCamper) {
  const response = await fetchWithNoCache(buildApiUrl('/campers'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(camper),
  });
  if (!response.ok) throw new Error('Erro ao criar campista');
  return response.json();
}

async function update(id: string, camper: Partial<InsertCamper>) {
  const response = await fetchWithNoCache(buildApiUrl(`/campers/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(camper),
  });
  if (!response.ok) throw new Error('Erro ao atualizar campista');
  return response.json();
}

async function remove(id: string) {
  const response = await fetchWithNoCache(buildApiUrl(`/campers/${id}`), {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar campista');
}

export const camperService = {
  findAll,
  findById,
  create,
  update,
  remove,
}