import { getTeamIdHeader } from '@/lib/auth';

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
  async getMonthlyPayments(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/monthly-payments`, { headers });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      return await response.json();
    } catch {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/monthly-registrations`, { headers });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      return await response.json();
    } catch {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/monthly-snackbar`, { headers });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      return await response.json();
    } catch {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/yearly-campers`, { headers });
      
      if (!response.ok) {
        return { total: 0, previousTotal: 0, percentageChange: null };
      }
      
      return await response.json();
    } catch {
      return { total: 0, previousTotal: 0, percentageChange: null };
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/camp-payments`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/dashboard/recent-registrations?limit=${limit}`, { headers });
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch {
      return [];
    }
  }
} 