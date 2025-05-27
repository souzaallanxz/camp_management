import { api } from '@/lib/api-client'

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

  async findAll(): Promise<Camp[]> {
    try {
      const response = await api.get('/camps')
      return response.data
    } catch (error) {
      this.debugError('Error fetching camps:', error)
      return []
    }
  }

  async findById(id: string): Promise<Camp | null> {
    try {
      const response = await api.get(`/camps/${id}`)
      return response.data
    } catch (error) {
      this.debugError(`Error fetching camp ${id}:`, error)
      return null
    }
  }

  async create(camp: CreateCampData): Promise<Camp | null> {
    try {
      const response = await api.post('/camps', camp)
      return response.data
    } catch (error) {
      this.debugError('Error creating camp:', error)
      return null
    }
  }

  async update(id: string, camp: Partial<Camp>): Promise<Camp | null> {
    try {
      const response = await api.put(`/camps/${id}`, camp)
      return response.data
    } catch (error) {
      this.debugError(`Error updating camp ${id}:`, error)
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await api.delete(`/camps/${id}`)
      return true
    } catch (error) {
      this.debugError(`Error deleting camp ${id}:`, error)
      return false
    }
  }
}

export const campService = new CampService() 