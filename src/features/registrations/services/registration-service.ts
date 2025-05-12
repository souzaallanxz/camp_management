import { getTeamIdHeader } from '@/lib/auth';

// For production, directly use the correct API URL with /api prefix
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

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
  total_paid?: number;
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
      
      const response = await fetch(`${API_BASE_URL}/registrations`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.map((registration: Registration) => ({
        ...registration,
        total_paid: Number(registration.total_paid) || 0
      }));
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Registration | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return {
        ...data,
        total_paid: Number(data.total_paid) || 0
      };
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
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      return {
        ...result,
        total_paid: Number(result.total_paid) || 0
      };
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
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      return {
        ...result,
        total_paid: Number(result.total_paid) || 0
      };
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  },

  async getRegistrationsByCamp(campId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camp/${campId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.map((registration: Registration) => ({
        ...registration,
        total_paid: Number(registration.total_paid) || 0
      }));
    } catch {
      return [];
    }
  },

  async getRegistrationsByCamper(camperId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camper/${camperId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.map((registration: Registration) => ({
        ...registration,
        total_paid: Number(registration.total_paid) || 0
      }));
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
        body: JSON.stringify({ onboarding_status: onboardingStatus }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      return {
        ...result,
        total_paid: Number(result.total_paid) || 0
      };
    } catch {
      return null;
    }
  }
};
