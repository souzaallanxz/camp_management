<<<<<<< HEAD
import { api } from '@/lib/api-client'
=======
import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
>>>>>>> integrations

export interface Camp {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  location: string;
  description: string;
  price: number;
  capacity: number;
  minimumAge: number;
  status: string;
  team_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampData {
  name: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  location: string;
  description: string;
  price: number;
  capacity: number;
  minimumAge: number;
  status: string;
}

class CampService {
  private debug(message: string, data?: unknown) {
    // Debug logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[CampService] ${message}`, data)
    }
  }

  private debugError(message: string, error: unknown) {
    // Error logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[CampService] ${message}`, error)
    }
  }

  // Get all camps
  async getCamps(): Promise<Camp[]> {
    try {
      const response = await api.get('/camps')
      return response.data
    } catch (error) {
      this.debugError('Error fetching camps:', error)
      throw error
    }
  }

  // Get camp by ID
  async getCampById(id: string): Promise<Camp> {
    try {
      const response = await api.get(`/camps/${id}`)
      return response.data
    } catch (error) {
      this.debugError(`Error fetching camp ${id}:`, error)
      throw error
    }
  }

  // Create new camp
  async createCamp(camp: Omit<Camp, 'id' | 'createdAt' | 'updatedAt'>): Promise<Camp> {
    try {
      const response = await api.post('/camps', camp)
      return response.data
    } catch (error) {
      this.debugError('Error creating camp:', error)
      throw error
    }
  }

  // Update camp
  async updateCamp(id: string, camp: Partial<Camp>): Promise<Camp> {
    try {
      const response = await api.put(`/camps/${id}`, camp)
      return response.data
    } catch (error) {
      this.debugError(`Error updating camp ${id}:`, error)
      throw error
    }
  }

  // Delete camp
  async deleteCamp(id: string): Promise<void> {
    try {
      await api.delete(`/camps/${id}`)
    } catch (error) {
      this.debugError(`Error deleting camp ${id}:`, error)
      throw error
    }
  }
}

export const campService = new CampService() 