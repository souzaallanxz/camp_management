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

export const dashboardService = {
  async getTeamIdHeader() {
    const teamId = localStorage.getItem('team_id');
    if (!teamId) throw new Error('team_id não encontrado no localStorage');
    return { 'x-team-id': teamId };
  },

  async getMonthlyPayments(): Promise<MetricData> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-payments`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-registrations`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar inscrições');
    return response.json();
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/monthly-snackbar`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar carregamentos');
    return response.json();
  },

  async getYearlyCampers(): Promise<MetricData> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/yearly-campers`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar campistas');
    return response.json();
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/camp-payments`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`, {
      headers: { ...await this.getTeamIdHeader() }
    }, 8000);
    
    if (!response.ok) throw new Error('Erro ao buscar inscrições recentes');
    return response.json();
  }
} 