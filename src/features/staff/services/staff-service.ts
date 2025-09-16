import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://api.campy.pt/api';

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
  snack_bar_balance?: number | string;
  totalLoaded?: number;
  totalSpent?: number;
  totalLiquidated?: number;
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
  },

  async liquidateSnackbarBalance(id: string): Promise<{ success: boolean; message?: string; liquidated_amount?: number }> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/staff/${id}/liquidate`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          message: errorData.error || 'Erro ao liquidar saldo do snackbar' 
        };
      }
      
      const data = await response.json();
      return { 
        success: true, 
        message: data.message,
        liquidated_amount: data.liquidated_amount
      };
    } catch {
      return { 
        success: false, 
        message: 'Erro de conexão ao liquidar saldo do snackbar' 
      };
    }
  },

  async getSnackbarBalanceRecords(staffId: string): Promise<any[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/staff/${staffId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      // Return the records array from the response
      return data.records || [];
    } catch {
      return [];
    }
  },

  async getSnackbarTotalSpent(staffId: string): Promise<number> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/staff/${staffId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      // Use the total_spent from the response
      return Number(data.total_spent) || 0;
    } catch {
      return 0;
    }
  },

  async getSnackbarTotalLoaded(staffId: string): Promise<number> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/staff/${staffId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      // Use the total_deposit from the response
      return Number(data.total_deposit) || 0;
    } catch {
      return 0;
    }
  },

  async getSnackbarTotalLiquidated(staffId: string): Promise<number> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-transactions/staff/${staffId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const transactions = await response.json();
      
      // Calcular total liquidado (apenas transações liquidadas)
      const totalLiquidated = transactions
        .filter((transaction: any) => transaction.is_liquidated)
        .reduce((sum: number, transaction: any) => sum + Number(transaction.amount), 0);
      
      return totalLiquidated;
    } catch {
      return 0;
    }
  }
}; 