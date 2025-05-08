import { getTeamIdHeader } from '@/lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${API_URL}/api`;

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

export const campService = {
  async findAll(): Promise<Camp[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/camps`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Camp | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/camps/${id}`, { headers });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async create(camp: CreateCampData): Promise<Camp | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/camps`, {
        method: 'POST',
        headers,
        body: JSON.stringify(camp)
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async update(id: string, camp: Partial<Camp>): Promise<Camp | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(camp)
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
      const response = await fetch(`${API_BASE_URL}/camps/${id}`, {
        method: 'DELETE',
        headers
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}; 