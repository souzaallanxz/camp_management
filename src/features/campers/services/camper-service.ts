import { db } from '@/lib/db'
import type { Camper, InsertCamper } from '../data/schema'

// Helper function for logging in development mode only
const devLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    if (data) {
    } else {
    }
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

async function getCurrentUserTeam() {
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data: team, error } = await db.rpc('get_current_user_team')
  if (error) throw error
  return team
}

async function findAll() {
  const response = await fetch(`${API_BASE_URL}/campers`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar campistas');
  return response.json();
}

async function findById(id: string) {
  const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar campista');
  return response.json();
}

async function create(camper: InsertCamper) {
  const response = await fetch(`${API_BASE_URL}/campers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(camper),
  });
  if (!response.ok) throw new Error('Erro ao criar campista');
  return response.json();
}

async function update(id: string, camper: Partial<Camper>) {
  const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(camper),
  });
  if (!response.ok) throw new Error('Erro ao atualizar campista');
  return response.json();
}

async function remove(id: string) {
  const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar campista');
}

async function findAllDirectly() {
  // Get all campers directly without filtering
  const { data, error } = await db
    .from('campers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    devLog('Error fetching all campers directly:', error)
    return []
  }

  return data || []
}

export const camperService = {
  findAll,
  findById,
  create,
  update,
  remove,
  findAllDirectly,
} 