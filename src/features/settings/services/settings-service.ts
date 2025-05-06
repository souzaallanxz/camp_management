import { buildApiUrl, fetchWithNoCache, API_PATHS } from '@/services/api';

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
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authenticated user found');
    
    const response = await fetchWithNoCache(buildApiUrl(API_PATHS.SETTINGS_PROFILE), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get profile settings');
    }
    
    return response.json();
  },
  
  async getOrganization(): Promise<OrganizationSettings> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authenticated user found');
    
    const response = await fetchWithNoCache(buildApiUrl(API_PATHS.SETTINGS_ORGANIZATION), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - Please log in again');
      }
      throw new Error('Failed to get organization settings');
    }
    
    return response.json();
  }
}; 