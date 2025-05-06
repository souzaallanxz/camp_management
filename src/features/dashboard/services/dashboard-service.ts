// Get API URL from environment with proper handling for production vs development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Check if we're in production environment (campmanagement.vercel.app)
const isProduction = API_URL.includes('campmanagement.vercel.app');

// In production, the API endpoints don't have /api prefix
const API_BASE_URL = isProduction ? API_URL : (API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`);

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

// Função auxiliar para requisições com timeout e sem cache
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Adicionar headers para prevenir cache
    const headers = {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Adicionar timestamp como query param para garantir resposta fresca
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    const urlWithTimestamp = `${url}${separator}_=${timestamp}`;

    const response = await fetch(urlWithTimestamp, { 
      ...options, 
      signal,
      headers,
      cache: 'no-store',
      // Definir referrerPolicy para evitar cache
      referrerPolicy: 'no-referrer'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-payments`, {
        headers,
        method: 'GET'
      }, 8000);
      
      const data = await response.json();
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      // Return default values if the request fails
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-registrations`, {
        headers,
        method: 'GET'
      }, 8000);
      
      const data = await response.json();
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      // Return default values if the request fails
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-snackbar`, {
        headers,
        method: 'GET'
      }, 8000);
      
      const data = await response.json();
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      // Return default values if the request fails
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/yearly-campers`, {
        headers,
        method: 'GET'
      }, 8000);
      
      const data = await response.json();
      return {
        total: data.current || 0,
        previousTotal: data.previous || 0,
        percentageChange: data.current > 0 && data.previous > 0 
          ? ((data.current - data.previous) / data.previous) * 100 
          : null
      };
    } catch {
      // Return default values if the request fails
      return {
        total: 0,
        previousTotal: 0,
        percentageChange: null
      };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/camp-payments`, {
        headers,
        method: 'GET'
      }, 8000);
      
      return await response.json();
    } catch {
      // Return empty array if the request fails
      return [];
    }
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    try {
      const headers = await this.getTeamIdHeader();
      const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`, {
        headers,
        method: 'GET'
      }, 8000);
      
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