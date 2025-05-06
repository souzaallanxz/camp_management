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
  if (import.meta.env.DEV) {
    return API_BASE_URL;
  }
  
  // Em produção, usar a URL correta
  return (import.meta.env.VITE_API_URL || window.location.origin) + '/api';
};

export const dashboardService = {
  async getTeamIdHeader() {
    const teamId = localStorage.getItem('team_id');
    if (!teamId) throw new Error('team_id não encontrado no localStorage');
    return { 'x-team-id': teamId };
  },
  
  async getDashboardData(): Promise<DashboardData> {
    // Dados mockados para teste em produção
    const mockData: DashboardData = {
      monthlyPayments: {
        total: 2500,
        previousTotal: 2000,
        percentageChange: 25
      },
      monthlyRegistrations: {
        total: 42,
        previousTotal: 35,
        percentageChange: 20
      },
      monthlySnackbar: {
        total: 1200,
        previousTotal: 1000,
        percentageChange: 20
      },
      yearlyCampers: {
        total: 150,
        previousTotal: 120,
        percentageChange: 25
      },
      campPayments: [
        {
          campId: '1',
          campName: 'Acampamento Verão',
          totalPayments: 1500,
          totalRegistrations: 25
        },
        {
          campId: '2',
          campName: 'Acampamento Inverno',
          totalPayments: 1000,
          totalRegistrations: 17
        }
      ],
      recentRegistrations: [
        {
          id: '1',
          name: 'Ana Silva',
          email: 'ana@exemplo.com',
          totalPaid: 65,
          createdAt: new Date().toISOString(),
          campName: 'Acampamento Verão'
        },
        {
          id: '2',
          name: 'Pedro Santos',
          email: 'pedro@exemplo.com',
          totalPaid: 65,
          createdAt: new Date().toISOString(),
          campName: 'Acampamento Verão'
        },
        {
          id: '3',
          name: 'Maria Oliveira',
          email: 'maria@exemplo.com',
          totalPaid: 65,
          createdAt: new Date().toISOString(),
          campName: 'Acampamento Inverno'
        },
        {
          id: '4',
          name: 'João Costa',
          email: 'joao@exemplo.com',
          totalPaid: 65,
          createdAt: new Date().toISOString(),
          campName: 'Acampamento Inverno'
        },
        {
          id: '5',
          name: 'Carla Souza',
          email: 'carla@exemplo.com',
          totalPaid: 65,
          createdAt: new Date().toISOString(),
          campName: 'Acampamento Verão'
        }
      ]
    };
    
    return mockData;
  },

  async getMonthlyPayments(): Promise<MetricData> {
    return {
      total: 2500,
      previousTotal: 2000,
      percentageChange: 25
    };
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    return {
      total: 42,
      previousTotal: 35,
      percentageChange: 20
    };
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    return {
      total: 1200,
      previousTotal: 1000,
      percentageChange: 20
    };
  },

  async getYearlyCampers(): Promise<MetricData> {
    return {
      total: 150,
      previousTotal: 120,
      percentageChange: 25
    };
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    return [
      {
        campId: '1',
        campName: 'Acampamento Verão',
        totalPayments: 1500,
        totalRegistrations: 25
      },
      {
        campId: '2',
        campName: 'Acampamento Inverno',
        totalPayments: 1000,
        totalRegistrations: 17
      }
    ];
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    const registrations: RecentRegistration[] = [
      {
        id: '1',
        name: 'Ana Silva',
        email: 'ana@exemplo.com',
        totalPaid: 65,
        createdAt: new Date().toISOString(),
        campName: 'Acampamento Verão'
      },
      {
        id: '2',
        name: 'Pedro Santos',
        email: 'pedro@exemplo.com',
        totalPaid: 65,
        createdAt: new Date().toISOString(),
        campName: 'Acampamento Verão'
      },
      {
        id: '3',
        name: 'Maria Oliveira',
        email: 'maria@exemplo.com',
        totalPaid: 65,
        createdAt: new Date().toISOString(),
        campName: 'Acampamento Inverno'
      },
      {
        id: '4',
        name: 'João Costa',
        email: 'joao@exemplo.com',
        totalPaid: 65,
        createdAt: new Date().toISOString(),
        campName: 'Acampamento Inverno'
      },
      {
        id: '5',
        name: 'Carla Souza',
        email: 'carla@exemplo.com',
        totalPaid: 65,
        createdAt: new Date().toISOString(),
        campName: 'Acampamento Verão'
      }
    ];
    
    return registrations.slice(0, limit);
  }
} 