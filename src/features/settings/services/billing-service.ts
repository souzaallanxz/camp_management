import { api } from '@/lib/api-client'

export interface SubscriptionStatus {
  tier: 'free' | 'premium'
  isPremium: boolean
  lastUpdated: string
}

export interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

export const billingService = {
  async createCheckoutSession(email?: string): Promise<CheckoutSessionResponse> {
    try {
      const response = await api.post('/billing/create-checkout-session', {
        email
      })
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to create checkout session')
    }
  },

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await api.get('/billing/subscription-status')
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again')
      }
      throw new Error('Failed to get subscription status')
    }
  }
}
