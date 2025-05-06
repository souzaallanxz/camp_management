import type { Camper, InsertCamper, UpdateCamper } from '../data/schema'
import api from '@/services/api'

export const camperService = {
  async findAll(): Promise<Camper[]> {
    return api.get('/campers', { 
      requireTeam: true 
    });
  },

  async findById(id: string): Promise<Camper> {
    return api.get(`/campers/${id}`, { 
      requireTeam: true 
    });
  },

  async create(camper: InsertCamper): Promise<Camper> {
    return api.post('/campers', camper, { 
      requireTeam: true 
    });
  },

  async update(id: string, camper: UpdateCamper): Promise<Camper> {
    return api.put(`/campers/${id}`, camper, { 
      requireTeam: true 
    });
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/campers/${id}`, { 
      requireTeam: true 
    });
  }
}

export async function getCampers(): Promise<Camper[]> {
  try {
    return await camperService.findAll();
  } catch {
    return [];
  }
}

export async function getCamperById(id: string): Promise<Camper> {
  return camperService.findById(id);
}