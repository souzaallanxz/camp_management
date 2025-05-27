import { api } from '@/lib/api-client'

<<<<<<< HEAD
// Interface for API response
=======
// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Interface para a resposta da API
>>>>>>> integrations
interface ApiRegistration {
  id: string
  form_id?: string
  name?: string
  email?: string
  contact?: string
  status?: string
  created_at?: string
  updated_at?: string
  camp_id?: string
  camp_name?: string
  camper_name?: string
  camper_email?: string
  total_paid?: number | string
  onboarding_status?: string
  // For other fields that might exist
  [key: string]: unknown
}

export interface Registration {
  id: string;
  campId: string;
  campName?: string;
  camperId: string;
  camperName?: string;
  status: 'paid' | 'partial' | 'unpaid' | string;
  createdAt: string;
  updatedAt: string;
  total_paid?: number;
  camp_price?: number;
}

export interface CreateRegistrationData {
  campId: string;
  camperId: string;
  totalAmount: number;
}

class RegistrationService {
  private debug(message: string, data?: unknown) {
    // Debug logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[RegistrationService] ${message}`, data)
    }
  }

  private debugError(message: string, error: unknown) {
    // Error logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[RegistrationService] ${message}`, error)
    }
  }

  // Get all registrations
  async getRegistrations(): Promise<ApiRegistration[]> {
    try {
      const response = await api.get('/registrations')
      return response.data
    } catch (error) {
      this.debugError('Error fetching registrations:', error)
      throw error
    }
  }

  // Get registration by ID
  async getRegistrationById(id: string): Promise<ApiRegistration> {
    try {
      const response = await api.get(`/registrations/${id}`)
      return response.data
    } catch (error) {
      this.debugError(`Error fetching registration ${id}:`, error)
      throw error
    }
  }

  // Create new registration
  async createRegistration(registration: Omit<ApiRegistration, 'id' | 'created_at' | 'updated_at'>): Promise<ApiRegistration> {
    try {
      const response = await api.post('/registrations', registration)
      return response.data
    } catch (error) {
      this.debugError('Error creating registration:', error)
      throw error
    }
  }

  // Update registration
  async updateRegistration(id: string, registration: Partial<ApiRegistration>): Promise<ApiRegistration> {
    try {
      const response = await api.put(`/registrations/${id}`, registration)
      return response.data
    } catch (error) {
      this.debugError(`Error updating registration ${id}:`, error)
      throw error
    }
  }

  // Delete registration
  async deleteRegistration(id: string): Promise<void> {
    try {
      await api.delete(`/registrations/${id}`)
    } catch (error) {
      this.debugError(`Error deleting registration ${id}:`, error)
      throw error
    }
  }

  // Get registrations by camp ID
  async getRegistrationsByCampId(campId: string): Promise<ApiRegistration[]> {
    try {
      const response = await api.get(`/camps/${campId}/registrations`)
      return response.data
    } catch (error) {
      this.debugError(`Error fetching registrations for camp ${campId}:`, error)
      throw error
    }
  }

  // Update registration status
  async updateRegistrationStatus(id: string, status: string): Promise<ApiRegistration> {
    try {
      const response = await api.patch(`/registrations/${id}/status`, { status })
      return response.data
    } catch (error) {
      this.debugError(`Error updating registration ${id} status:`, error)
      throw error
    }
  }
}

export const registrationService = new RegistrationService()
