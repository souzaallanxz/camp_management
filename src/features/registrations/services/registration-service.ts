import { db } from '@/lib/db'
import { sqlNeon } from '@/lib/sql-neon'
import type { Registration, InsertRegistration, UpdateRegistration } from '../data/schema'
import { getCurrentUserTeam } from '@/features/auth/auth-service'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getTeamIdHeader() {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  return { 'x-team-id': teamId };
}

export const registrationService = {
  async findAll() {
    const response = await fetch(`${API_BASE_URL}/registrations`, {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrições');
    return response.json();
  },

  async findById(id: string) {
    const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrição');
    return response.json();
  },

  async create(registration: InsertRegistration) {
    const response = await fetch(`${API_BASE_URL}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(registration),
    });
    if (!response.ok) throw new Error('Erro ao criar inscrição');
    return response.json();
  },

  async update(id: string, registration: UpdateRegistration) {
    const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
      credentials: 'include',
      body: JSON.stringify(registration),
    });
    if (!response.ok) throw new Error('Erro ao atualizar inscrição');
    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
      method: 'DELETE',
      headers: { ...getTeamIdHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Erro ao deletar inscrição');
  }
}

export async function getRegistrations() {
  const response = await fetch(`${API_BASE_URL}/registrations`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) return [];
  return response.json();
}

export async function getRegistrationById(id: string): Promise<Registration> {
  const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao buscar inscrição');
  return response.json();
}

export async function updateRegistration(id: string, registration: UpdateRegistration) {
  const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(registration),
  });
  if (!response.ok) throw new Error('Erro ao atualizar inscrição');
  return response.json();
}

export async function deleteRegistration(id: string) {
  const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
    method: 'DELETE',
    headers: { ...getTeamIdHeader() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Erro ao deletar inscrição');
}

export async function updateOnboardingStatus(registrationId: string, onboardingStatus: string) {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/registrations/${registrationId}/onboarding-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-team-id': teamId
    },
    credentials: 'include',
    body: JSON.stringify({ onboarding_status: onboardingStatus })
  });
  if (!response.ok) throw new Error('Erro ao atualizar status de onboarding');
  return response.json();
}

export async function createRegistration(registration: InsertRegistration) {
  const response = await fetch(`${API_BASE_URL}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getTeamIdHeader() },
    credentials: 'include',
    body: JSON.stringify(registration),
  });
  if (!response.ok) throw new Error('Erro ao criar inscrição');
  return response.json();
}
