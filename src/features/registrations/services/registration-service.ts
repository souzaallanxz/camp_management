import { getTeamIdHeader } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Registration {
  id: string;
  campId: string;
  campName?: string;
  camperId: string;
  camperName?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegistrationData {
  campId: string;
  camperId: string;
  totalAmount: number;
}

export const registrationService = {
  async findAll(): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Registration | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, { headers });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async create(data: CreateRegistrationData): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async update(id: string, data: Partial<Registration>): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
        method: 'DELETE',
        headers
      });
      
      return response.ok;
    } catch {
      return false;
    }
  },

  async getRegistrationsByCamp(campId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camp/${campId}`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async getRegistrationsByCamper(camperId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camper/${camperId}`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async updateOnboardingStatus(registrationId: string, onboardingStatus: string): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations/${registrationId}/onboarding-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ onboarding_status: onboardingStatus })
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  }
};
