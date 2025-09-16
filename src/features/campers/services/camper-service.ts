import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://campy.pt/api';

export interface Camper {
  id: string;
  name: string;
  email: string;
  contact?: string | null;
  registration_id?: string;
  form_id?: string | null;
  camp?: string | { name?: string };
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
  id_number?: string | null;
  sns_number?: string | null;
  date_of_birth?: string | null;
  dietary_restrictions?: string | null;
  guardian_name?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
  snack_bar_balance?: number | string;
  payment_status?: string;
  totalLoaded?: number;
  totalSpent?: number;
  totalLiquidated?: number;
  camp_name?: string;
}

// Interface específica para criar campers que corresponde aos campos do backend
export interface CreateCamperData {
  name: string;
  email: string;
  contact?: string | null;
  registration_id: string;
  camp?: string;
  form_id?: string | null;
  additional_notes?: string | null;
}

// Interface para criar campers manualmente (sem registration_id)
export interface CreateManualCamperData {
  name: string;
  email: string;
  contact?: string | null;
  registration_id?: string;
  camp?: string;
  form_id?: string | null;
  additional_notes?: string | null;
}

interface SnackbarTransaction {
  id: string;
  camper_id: string;
  amount: number;
  description?: string;
  is_liquidated: boolean;
  created_at: string;
}

interface SnackbarBalanceRecord {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}



export const camperService = {
  async findAll(): Promise<Camper[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/campers`, { 
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

  async findAllWithSnackbarData(): Promise<(Camper & { totalLoaded?: number; totalSpent?: number })[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/campers`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      // O endpoint já retorna os dados com totalLoaded e totalSpent
      return await response.json();
    } catch {
      return [];
    }
  },

  async findById(id: string): Promise<Camper | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, { 
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

  async create(camper: CreateCamperData | CreateManualCamperData): Promise<Camper | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/campers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(camper),
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

  async update(id: string, camper: Partial<Camper>): Promise<Camper | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(camper),
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
      const response = await fetch(`${API_BASE_URL}/campers/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  },

  async liquidateSnackbarBalance(id: string): Promise<{ success: boolean; message?: string; liquidated_amount?: number }> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/${id}/liquidate`, {
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

  async getSnackbarTransactions(camperId: string): Promise<SnackbarTransaction[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-transactions/${camperId}`, { 
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

  async getSnackbarTotalSpent(camperId: string): Promise<number> {
    try {
      const transactions = await this.getSnackbarTransactions(camperId);
      
      // Calcular total de compras (apenas transações não liquidadas)
      const totalSpent = transactions
        .filter(transaction => !transaction.is_liquidated)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      
      return totalSpent;
    } catch {
      return 0;
    }
  },

  async getSnackbarTotalLoaded(camperId: string): Promise<number> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/camper/${camperId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      // Calcular total carregado somando apenas registros confirmados (excluindo expired)
      const totalLoaded = data
        .filter((record: SnackbarBalanceRecord) => record.payment_status !== 'expired')
        .reduce((sum: number, record: SnackbarBalanceRecord) => sum + Number(record.amount), 0);
      
      return totalLoaded;
    } catch {
      return 0;
    }
  },

  async getSnackbarTotalLiquidated(camperId: string): Promise<number> {
    try {
      const transactions = await this.getSnackbarTransactions(camperId);
      
      // Calcular total liquidado (apenas transações liquidadas)
      const totalLiquidated = transactions
        .filter(transaction => transaction.is_liquidated)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      
      return totalLiquidated;
    } catch {
      return 0;
    }
  },

  async getSnackbarBalanceRecords(camperId: string): Promise<SnackbarBalanceRecord[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/snackbar-balance/camper/${camperId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      // Filtrar apenas registros que não estão expirados
      return data.filter((record: SnackbarBalanceRecord) => record.payment_status !== 'expired');
    } catch {
      return [];
    }
  }
};