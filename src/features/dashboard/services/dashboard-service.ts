import { api, API_PATHS } from '@/services/api';

// Hard-code the direct base URL for endpoints
const API_BASE_URL = 'https://campmanagement.vercel.app';

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
}

export interface DashboardData {
  monthlyPayments: MetricData;
  monthlyRegistrations: MetricData;
  monthlySnackbar: MetricData;
  yearlyCampers: MetricData;
  campPayments: CampPaymentsData[];
  recentRegistrations: RecentRegistration[];
}

// Simple fetch helper without caching logic
const simpleFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  
  return response;
};

export const dashboardService = {
  async getTeamIdHeader() {
    const teamId = localStorage.getItem('team_id');
    if (!teamId) throw new Error('team_id não encontrado no localStorage');
    return { 'x-team-id': teamId };
  },
  
  async getDashboardData(): Promise<DashboardData> {
    try {
      // Buscar todos os dados em paralelo
      const [
        monthlyPayments,
        monthlyRegistrations,
        monthlySnackbar,
        yearlyCampers,
        campPayments,
        recentRegistrations
      ] = await Promise.all([
        this.getMonthlyPayments(),
        this.getMonthlyRegistrations(),
        this.getMonthlySnackbarTransactions(),
        this.getYearlyCampers(),
        this.getCampPayments(),
        this.getRecentRegistrations(5)
      ]);
      
      return {
        monthlyPayments,
        monthlyRegistrations,
        monthlySnackbar,
        yearlyCampers,
        campPayments,
        recentRegistrations
      };
    } catch {
      throw new Error('Erro ao buscar dados do dashboard');
    }
  },

  async getMonthlyPayments(): Promise<MetricData> {
    try {
      const data = await api.get<{ current: number; previous: number }>(
        API_PATHS.DASHBOARD_MONTHLY_PAYMENTS
      );
      
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    try {
      const data = await api.get<{ current: number; previous: number }>(
        API_PATHS.DASHBOARD_MONTHLY_REGISTRATIONS
      );
      
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    try {
      const data = await api.get<{ current: number; previous: number }>(
        API_PATHS.DASHBOARD_MONTHLY_SNACKBAR
      );
      
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    try {
      const data = await api.get<{ current: number; previous: number }>(
        API_PATHS.DASHBOARD_YEARLY_CAMPERS
      );
      
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      return await api.get<CampPaymentsData[]>(API_PATHS.DASHBOARD_CAMP_PAYMENTS);
    } catch {
      return [];
    }
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await simpleFetch(`${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`, {
        headers,
        method: 'GET'
      });
      
      const data = await response.json();
      return data.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: (item.camper_name || item.name) as string,
        email: (item.camper_email || item.email) as string,
        totalPaid: (item.total_paid || 0) as number,
        createdAt: (item.created_at || item.createdAt) as string,
        campName: (item.camp_name || item.campName) as string
      }));
    } catch {
      // Return empty array if the request fails
      return [];
    }
  }
} 