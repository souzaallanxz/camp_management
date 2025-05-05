import type { Registration, InsertRegistration, UpdateRegistration } from '../data/schema'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export const registrationService = {
  async findAll() {
    const response = await fetch(`${API_BASE_URL}/api/registrations`, {
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrições');
    return response.json();
  },

  async findById(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrição');
    return response.json();
  },

  async create(registration: InsertRegistration) {
    const response = await fetch(`${API_BASE_URL}/api/registrations`, {
      method: 'POST',
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(registration),
    });
    if (!response.ok) throw new Error('Erro ao criar inscrição');
    return response.json();
  },

  async update(id: string, registration: UpdateRegistration) {
    const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
      method: 'PUT',
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(registration),
    });
    if (!response.ok) throw new Error('Erro ao atualizar inscrição');
    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
      method: 'DELETE',
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao deletar inscrição');
  }
}

export async function getRegistrations() {
  const response = await fetch(`${API_BASE_URL}/api/registrations`, {
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
}

export async function getRegistrationById(id: string): Promise<Registration> {
  const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar inscrição');
  return response.json();
}

export async function updateRegistration(id: string, registration: UpdateRegistration) {
  const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
    method: 'PUT',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(registration),
  });
  if (!response.ok) throw new Error('Erro ao atualizar inscrição');
  return response.json();
}

export async function deleteRegistration(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar inscrição');
}

export async function updateOnboardingStatus(registrationId: string, onboardingStatus: string) {
  const response = await fetch(`${API_BASE_URL}/api/registrations/${registrationId}/onboarding-status`, {
    method: 'PATCH',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify({ onboarding_status: onboardingStatus })
  });
  if (!response.ok) throw new Error('Erro ao atualizar status de onboarding');
  return response.json();
}

export async function createRegistration(registration: InsertRegistration) {
  const response = await fetch(`${API_BASE_URL}/api/registrations`, {
    method: 'POST',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(registration),
  });
  if (!response.ok) throw new Error('Erro ao criar inscrição');
  return response.json();
}
