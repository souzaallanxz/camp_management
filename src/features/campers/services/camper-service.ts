import type { Camper, InsertCamper, UpdateCamper } from '../data/schema'
import { api, API_PATHS } from '@/services/api'

export const camperService = {
  async getCampers() {
    try {
      return await api.get<Camper[]>(API_PATHS.CAMPERS);
    } catch {
      return [];
    }
  },

  async getCamper(id: string) {
    try {
      return await api.get<Camper>(API_PATHS.CAMPER(id));
    } catch {
      return null;
    }
  },

  async createCamper(data: InsertCamper) {
    try {
      return await api.post<Camper>(API_PATHS.CAMPERS, data);
    } catch {
      throw new Error('Failed to create camper');
    }
  },

  async updateCamper(id: string, data: UpdateCamper) {
    try {
      return await api.put<Camper>(API_PATHS.CAMPER(id), data);
    } catch {
      throw new Error('Failed to update camper');
    }
  },

  async deleteCamper(id: string) {
    try {
      await api.delete(API_PATHS.CAMPER(id));
    } catch {
      throw new Error('Failed to delete camper');
    }
  }
};