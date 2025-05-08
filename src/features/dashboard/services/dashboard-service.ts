import { getTeamIdHeader } from '@/lib/auth';

// For production, directly use the correct API URL
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

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
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Monthly payments API error:', response.status, await response.text());
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      console.log('Monthly payments response:', data);
      
      // Converter o formato da API para o formato esperado pelo componente
      const current = parseFloat(data.current || '0');
      const previous = parseFloat(data.previous || '0');
      const percentageChange = previous === 0 
        ? null 
        : ((current - previous) / previous) * 100;
      
      return {
        total: current,
        previousTotal: previous,
        percentageChange
      };
    } catch (error) {
      console.error('Monthly payments error:', error);
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-registrations`;
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Monthly registrations API error:', response.status, await response.text());
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      console.log('Monthly registrations response:', data);
      
      // Converter o formato da API para o formato esperado pelo componente
      const current = parseFloat(data.current || '0');
      const previous = parseFloat(data.previous || '0');
      const percentageChange = previous === 0 
        ? null 
        : ((current - previous) / previous) * 100;
      
      return {
        total: current,
        previousTotal: previous,
        percentageChange
      };
    } catch (error) {
      console.error('Monthly registrations error:', error);
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/monthly-snackbar`;
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Monthly snackbar API error:', response.status, await response.text());
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      console.log('Monthly snackbar response:', data);
      
      // Converter o formato da API para o formato esperado pelo componente
      const current = parseFloat(data.current || '0');
      const previous = parseFloat(data.previous || '0');
      const percentageChange = previous === 0 
        ? null 
        : ((current - previous) / previous) * 100;
      
      return {
        total: current,
        previousTotal: previous,
        percentageChange
      };
    } catch (error) {
      console.error('Monthly snackbar error:', error);
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/yearly-campers`;
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include' 
      });
      
      if (!response.ok) {
        console.error('Yearly campers API error:', response.status, await response.text());
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      const data = await response.json();
      console.log('Yearly campers response:', data);
      
      // Converter o formato da API para o formato esperado pelo componente
      const current = parseFloat(data.current || '0');
      const previous = parseFloat(data.previous || '0');
      const percentageChange = previous === 0 
        ? null 
        : ((current - previous) / previous) * 100;
      
      return {
        total: current,
        previousTotal: previous,
        percentageChange
      };
    } catch (error) {
      console.error('Yearly campers error:', error);
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/camp-payments`;
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Camp payments API error:', response.status, await response.text());
        return [];
      }
      
      const data = await response.json();
      console.log('Camp payments response:', data);
      
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
      console.error('Camp payments error:', error);
      return [];
    }
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const url = `${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`;
      console.log('API URL:', url);
      console.log('Headers:', JSON.stringify(headers));
      
      const response = await fetch(url, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Recent registrations API error:', response.status, await response.text());
        return [];
      }
      
      const data = await response.json();
      console.log('Recent registrations response:', data);
      
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
          
          // Garantir que o console.log mostre os dados mapeados para depuração
          console.log('Mapeado:', { 
            id, 
            name, 
            email, 
            totalPaid, 
            createdAt, 
            campName, 
            status 
          });
          
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
      console.error('Recent registrations error:', error);
      return [];
    }
  }
} 