import { api } from '@/lib/api-client'

interface MBWayIntegration {
  id: string
  mbway_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MBWayIntegrationForm {
  mbway_key: string
  is_active: boolean
}

interface StripeIntegration {
  id: string
  publishable_key: string
  secret_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface StripeIntegrationForm {
  publishable_key: string
  secret_key: string
  is_active: boolean
}

export const integrationsService = {
  async getMBWayIntegration(): Promise<MBWayIntegration | null> {
    try {
      const response = await api.get('/integrations/mbway')
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw new Error('Failed to get MBWay integration')
    }
  },

  async createMBWayIntegration(data: MBWayIntegrationForm): Promise<MBWayIntegration> {
    try {
      const response = await api.post('/integrations/mbway', data)
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to create MBWay integration')
    }
  },

  async updateMBWayIntegration(id: string, data: MBWayIntegrationForm): Promise<MBWayIntegration> {
    try {
      const response = await api.put(`/integrations/mbway/${id}`, data)
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to update MBWay integration')
    }
  },

  async deleteMBWayIntegration(id: string): Promise<boolean> {
    try {
      await api.delete(`/integrations/mbway/${id}`)
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to delete MBWay integration')
    }
  },

  async testMBWayConnection(): Promise<boolean> {
    try {
      const response = await api.post('/integrations/mbway/test')
      return response.data.success
    } catch (error) {
      return false
    }
  },

  // Stripe Integration Methods (Placeholders)
  async getStripeIntegration(): Promise<StripeIntegration | null> {
    try {
      const response = await api.get('/integrations/stripe')
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw new Error('Failed to get Stripe integration')
    }
  },

  async createStripeIntegration(data: StripeIntegrationForm): Promise<StripeIntegration> {
    try {
      const response = await api.post('/integrations/stripe', data)
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to create Stripe integration')
    }
  },

  async updateStripeIntegration(id: string, data: StripeIntegrationForm): Promise<StripeIntegration> {
    try {
      const response = await api.put(`/integrations/stripe/${id}`, data)
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to update Stripe integration')
    }
  },

  async deleteStripeIntegration(id: string): Promise<boolean> {
    try {
      await api.delete(`/integrations/stripe/${id}`)
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to delete Stripe integration')
    }
  },

  async testStripeConnection(): Promise<boolean> {
    try {
      const response = await api.post('/integrations/stripe/test')
      return response.data.success
    } catch (error) {
      return false
    }
  }
} 