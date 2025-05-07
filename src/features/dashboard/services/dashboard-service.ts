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

export const dashboardService = {
  async getTeamIdHeader() {
    // Verificar as duas possíveis chaves para compatibilidade
    let teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
    
    // Se não encontrou, tentar buscar dos dados do usuário no localStorage
    if (!teamId) {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.team_id) {
            teamId = user.team_id;
            // Salvar para uso futuro nos dois formatos para garantir compatibilidade
            localStorage.setItem('teamId', teamId);
            localStorage.setItem('team_id', teamId);
          }
        }
      } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
      }
    }
    
    if (!teamId) throw new Error('ID da equipe não encontrado');
    return { 'x-team-id': teamId };
  },

  async getMonthlyPayments(): Promise<MetricData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/monthly-payments`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/monthly-registrations`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrições');
    return response.json();
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/monthly-snackbar`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar carregamentos');
    return response.json();
  },

  async getYearlyCampers(): Promise<MetricData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/yearly-campers`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar campistas');
    return response.json();
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/camp-payments`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar pagamentos');
    return response.json();
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`, {
      headers: { ...await this.getTeamIdHeader() },
    });
    if (!response.ok) throw new Error('Erro ao buscar inscrições recentes');
    return response.json();
  }
} 