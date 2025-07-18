import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://camp-management-1.onrender.com/api';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  camp_id: string;
  camp_name?: string;
  created_at: string;
  updated_at: string;
  total_balance?: number;
  payment_status?: string;
}

// Interface específica para criar staff
export interface CreateStaffData {
  name: string;
  email: string;
  phone: string;
  camp_id: string;
}

export const staffService = {
  async findAll(): Promise<Staff[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/staff`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Staff | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, { 
        headers,
        credentials: 'include' 
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async create(staff: CreateStaffData): Promise<Staff | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers,
        body: JSON.stringify(staff),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  },

  async update(id: string, staff: Partial<Staff>): Promise<Staff | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(staff),
        credentials: 'include'
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
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}; 