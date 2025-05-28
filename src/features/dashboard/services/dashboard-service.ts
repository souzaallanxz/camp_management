import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface MetricData {
  total: number
  previousTotal: number
  percentageChange: number | null
}

export interface CampPaymentsData {
  campId: string
  campName: string
  totalPayments: number
  totalRegistrations: number
}

export interface RecentRegistration {
  id: string
  name: string
  email: string
  totalPaid: number
  createdAt: string
  campName: string
  status: string
}

export const dashboardService = {
  async getMonthlyPayments(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-payments`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0,
        previousTotal: data.previousTotal || 0,
        percentageChange: data.percentageChange
      };
    } catch (error) {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-registrations`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0,
        previousTotal: data.previousTotal || 0,
        percentageChange: data.percentageChange
      };
    } catch (error) {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-snackbar`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0,
        previousTotal: data.previousTotal || 0,
        percentageChange: data.percentageChange
      };
    } catch (error) {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/yearly-campers`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include' 
      });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0,
        previousTotal: data.previousTotal || 0,
        percentageChange: data.percentageChange
      };
    } catch (error) {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/camp-payments`;      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // Mapear os dados para o formato esperado
      if (Array.isArray(data)) {
        return data.map((camp, index) => ({
          campId: camp.id || camp.campId || String(index),
          campName: camp.name || camp.campName || 'Acampamento',
          totalPayments: parseFloat(camp.total || camp.total_payments || camp.totalPayments || '0'),
          totalRegistrations: parseInt(camp.registrations || camp.total_registrations || camp.totalRegistrations || '0')
        }));
      }
      
      return [];
    } catch (error) {
      return [];
    }
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // Mapear os dados para o formato esperado
      if (Array.isArray(data)) {
        return data.map(registration => {
          // Verificar todos os possíveis formatos de campo que a API pode retornar
          const id = registration.id || registration.registration_id || '';
          const name = registration.camper_name || registration.name || registration.participant_name || registration.user_name || '';
          const email = registration.camper_email || registration.email || registration.participant_email || registration.user_email || '';
          const totalPaid = parseFloat(registration.total_paid || registration.totalPaid || '0');
          const createdAt = registration.created_at || registration.createdAt || '';
          const campName = registration.camp_name || registration.campName || '';
          const status = registration.status || 'unknown';
          
          return {
            id,
            name,
            email,
            totalPaid,
            createdAt,
            campName,
            status
          };
        });
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
} 