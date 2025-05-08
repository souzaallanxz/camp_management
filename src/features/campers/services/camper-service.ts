import { getTeamIdHeader } from '@/lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${API_URL}/api`;

export interface Camper {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  birthday: string;
  emergencyContact: string;
  emergencyPhone: string;
  identificationDocument: string;
  guardianName: string;
  guardianPhone: string;
  allergies: string;
  medications: string;
  foodRestrictions: string;
  observations: string;
  pictureAuthorization: boolean;
  shirtSize: string;
  isMinor: boolean;
  user_id: string | null;
  team_id: string;
  lastCamp?: string;
  createdAt: string;
  updatedAt: string;
}

export const camperService = {
  async findAll(): Promise<Camper[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/campers`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Camper | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, { headers });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async create(camper: Partial<Camper>): Promise<Camper | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/campers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(camper)
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async update(id: string, camper: Partial<Camper>): Promise<Camper | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(camper)
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
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
};