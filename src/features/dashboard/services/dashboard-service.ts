import { getTeamIdHeader } from '@/lib/auth';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://campy.pt/api';

export interface MetricData {
  total: number
  previousTotal?: number
  percentageChange?: number | null
}

export interface CampPaymentsData {
  campId: string
  campName: string
  totalPayments: number
  totalRegistrations: number
  totalSnackbar: number
  totalLiquidated?: number
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
  async getTotalPayments(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-payments`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0 };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching total payments:', error);
      return { total: 0 };
    }
  },

  async getTotalRegistrations(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-registrations`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0 };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching total registrations:', error);
      return { total: 0 };
    }
  },

  async getTotalSnackbarTransactions(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-snackbar`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return { total: 0 };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching total snackbar transactions:', error);
      return { total: 0 };
    }
  },

  async getTotalCampers(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/yearly-campers`;
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include' 
      });
      
      if (!response.ok) {
        return { total: 0 };
      }
      
      const data = await response.json();
      return {
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching total campers:', error);
      return { total: 0 };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      
      // Buscar dados de pagamentos por acampamento
      const paymentsUrl = `${API_BASE_URL}/dashboard/camp-payments`;
      const paymentsResponse = await fetch(paymentsUrl, { 
        headers,
        credentials: 'include'
      });
      
      // Buscar dados de snackbar por acampamento
      const snackbarUrl = `${API_BASE_URL}/dashboard/camp-snackbar`;
      const snackbarResponse = await fetch(snackbarUrl, { 
        headers,
        credentials: 'include'
      });
      
      if (!paymentsResponse.ok || !snackbarResponse.ok) {
        return [];
      }
      
      const paymentsData = await paymentsResponse.json();
      const snackbarData = await snackbarResponse.json();
      
      // Mapear os dados para o formato esperado
      if (Array.isArray(paymentsData)) {
        return paymentsData.map((camp, index) => {
          const campId = camp.id || camp.campId || String(index);
          const campName = camp.name || camp.campName || 'Acampamento';
          
          // Total de inscrições da tabela payments
          const totalPayments = parseFloat(camp.total || camp.total_payments || camp.totalPayments || '0');
          
          // Total de snackbar da tabela snackbar_balance
          const snackbarCamp = snackbarData.find((s: any) => s.campId === campId);
          const totalSnackbar = snackbarCamp ? parseFloat(snackbarCamp.totalSnackbar || '0') : 0;
          const totalLiquidated = snackbarCamp ? parseFloat(snackbarCamp.totalLiquidated || '0') : 0;
          
          return {
            campId,
            campName,
            totalPayments,
            totalRegistrations: parseInt(camp.registrations || camp.total_registrations || camp.totalRegistrations || '0'),
            totalSnackbar,
            totalLiquidated
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching camp payments:', error);
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
      console.error('Error fetching recent registrations:', error);
      return [];
    }
  }
} 