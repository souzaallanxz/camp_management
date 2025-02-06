import { supabase } from '@/lib/supabase'

export interface MetricData {
  total: number
  previousTotal: number
  percentageChange: number | null
}

export const dashboardService = {
  async getMonthlyPayments(): Promise<MetricData> {
    const now = new Date()
    const { data, error } = await supabase.rpc('get_team_monthly_payments', {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1
    })

    if (error) throw error

    return {
      total: Number(data[0].total_amount) || 0,
      previousTotal: Number(data[0].previous_month_total) || 0,
      percentageChange: data[0].percentage_change
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    const now = new Date()
    const { data, error } = await supabase.rpc('get_team_monthly_registrations', {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1
    })

    if (error) throw error

    return {
      total: Number(data[0].total_count) || 0,
      previousTotal: Number(data[0].previous_month_count) || 0,
      percentageChange: data[0].percentage_change
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    const now = new Date()
    const { data, error } = await supabase.rpc('get_team_monthly_snackbar_transactions', {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1
    })

    if (error) throw error

    return {
      total: Number(data[0].total_amount) || 0,
      previousTotal: Number(data[0].previous_month_total) || 0,
      percentageChange: data[0].percentage_change
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    const now = new Date()
    const { data, error } = await supabase.rpc('get_team_yearly_campers', {
      p_year: now.getFullYear()
    })

    if (error) throw error

    return {
      total: Number(data[0].total_count) || 0,
      previousTotal: Number(data[0].previous_year_count) || 0,
      percentageChange: data[0].percentage_change
    }
  }
} 