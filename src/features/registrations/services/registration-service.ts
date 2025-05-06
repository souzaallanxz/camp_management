import type { Registration, InsertRegistration, UpdateRegistration } from '../data/schema'
import api from '@/services/api'

export const registrationService = {
  async findAll(): Promise<Registration[]> {
    return api.get('/registrations', { 
      requireTeam: true 
    });
  },

  async findById(id: string): Promise<Registration> {
    return api.get(`/registrations/${id}`, { 
      requireTeam: true 
    });
  },

  async create(registration: InsertRegistration): Promise<Registration> {
    return api.post('/registrations', registration, { 
      requireTeam: true 
    });
  },

  async update(id: string, registration: UpdateRegistration): Promise<Registration> {
    return api.put(`/registrations/${id}`, registration, { 
      requireTeam: true 
    });
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/registrations/${id}`, { 
      requireTeam: true 
    });
  }
}

export async function getRegistrations(): Promise<Registration[]> {
  try {
    return await registrationService.findAll();
  } catch {
    return [];
  }
}

export async function getRegistrationById(id: string): Promise<Registration> {
  return registrationService.findById(id);
} 