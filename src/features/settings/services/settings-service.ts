import { api } from '@/lib/api-client';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationSettings {
  id: string;
  name: string;
  logo_url: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
}

export const settingsService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get('/settings/profile');
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get profile settings');
    }
  },
  
  async getOrganization(): Promise<OrganizationSettings> {
    try {
      const response = await api.get('/settings/organization');
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get organization settings');
    }
  }
}; 