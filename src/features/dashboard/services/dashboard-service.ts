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
    const urlWithTimestamp = `${url}${separator}_=${Date.now()}`;

    const response = await fetch(urlWithTimestamp, { 
      ...options, 
      signal,
      headers,
      cache: 'no-store',
      // Definir referrerPolicy para evitar cache
      referrerPolicy: 'no-referrer'
    });
    
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Função para determinar o URL base correto para requisições
const getApiBaseUrl = () => {
  // Se estamos em desenvolvimento, usa a URL normal da API
  if (import.meta.env.DEV) {
    return API_BASE_URL;
  }
  
  // Em produção, usar a URL correta para os endpoints do dashboard
  return import.meta.env.VITE_API_URL || window.location.origin;
};

export const dashboardService = {
  async getTeamIdHeader() {
    const teamId = localStorage.getItem('team_id');
    if (!teamId) throw new Error('team_id não encontrado no localStorage');
    return { 'x-team-id': teamId };
  },
  
  async getDashboardData(): Promise<DashboardData> {
    const baseUrl = getApiBaseUrl();
    // Em produção, a URL será /dashboard/data diretamente
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/data` 
      : `${baseUrl}/dashboard/data`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 10000);
    
    if (!response.ok) throw new Error('Erro ao buscar dados do dashboard');
    return response.json();
  },

  async getMonthlyPayments(): Promise<MetricData> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/monthly-payments` 
      : `${baseUrl}/dashboard/monthly-payments`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/monthly-registrations` 
      : `${baseUrl}/dashboard/monthly-registrations`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar inscrições');
    return response.json();
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/monthly-snackbar` 
      : `${baseUrl}/dashboard/monthly-snackbar`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar carregamentos');
    return response.json();
  },

  async getYearlyCampers(): Promise<MetricData> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/yearly-campers` 
      : `${baseUrl}/dashboard/yearly-campers`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar campistas');
    return response.json();
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/camp-payments` 
      : `${baseUrl}/dashboard/camp-payments`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl.includes('/api') 
      ? `${baseUrl}/dashboard/recent-registrations?limit=${limit}` 
      : `${baseUrl}/dashboard/recent-registrations?limit=${limit}`;
    
    const response = await fetchWithTimeout(url, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar inscrições recentes');
    return response.json();
  }
} 