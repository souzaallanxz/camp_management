import type { Camp, InsertCamp, UpdateCamp } from '../data/schema'
import api from '@/services/api'

export const campService = {
  async findAll(): Promise<Camp[]> {
    return api.get('/camps', { 
      requireTeam: true 
    });
  },

  async findById(id: string): Promise<Camp> {
    return api.get(`/camps/${id}`, { 
      requireTeam: true 
    });
  },

  async create(camp: InsertCamp): Promise<Camp> {
    return api.post('/camps', camp, { 
      requireTeam: true 
    });
  },

  async update(id: string, camp: UpdateCamp): Promise<Camp> {
    return api.put(`/camps/${id}`, camp, { 
      requireTeam: true 
    });
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/camps/${id}`, { 
      requireTeam: true 
    });
  }
}

export async function getCamps(): Promise<Camp[]> {
  try {
    return await campService.findAll();
  } catch {
    // Silenciosamente retorna um array vazio em caso de erro
    return [];
  }
}

export async function getCampById(id: string): Promise<Camp> {
  return campService.findById(id);
} 