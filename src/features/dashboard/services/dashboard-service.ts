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
      
      return await response.json();
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
      
      return await response.json();
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
      
      return await response.json();
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
      
      return await response.json();
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
      
      return await response.json();
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
      
      return await response.json();
    } catch (error) {
      console.error('Recent registrations error:', error);
      return [];
    }
  }
} 