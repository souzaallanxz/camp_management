import { api, API_PATHS } from '@/services/api';

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
      return await api.get<UserProfile>(API_PATHS.SETTINGS_PROFILE);
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get profile settings');
    }
  },
  
  async getOrganization(): Promise<OrganizationSettings> {
    try {
      return await api.get<OrganizationSettings>(API_PATHS.SETTINGS_ORGANIZATION);
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get organization settings');
    }
  }
}; 