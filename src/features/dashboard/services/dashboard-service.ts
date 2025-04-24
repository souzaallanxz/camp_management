import { db } from '@/lib/db'
import { teamService } from '@/features/teams/services/team-service'

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

interface RawCampPaymentsData {
  camp_id: string
  camp_name: string
  total_payments: number
  total_registrations: number
}

interface RawRecentRegistration {
  id: string
  name: string
  email: string
  total_paid: number
  created_at: string
  camp_name: string
}

// Função auxiliar para obter o team_id do usuário atual
async function getCurrentTeamId(): Promise<string | null> {
  const team = await teamService.getCurrentUserTeam()
  return team?.id || null
}

export const dashboardService = {
  async getMonthlyPayments(): Promise<MetricData> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return { total: 0, previousTotal: 0, percentageChange: null }
    }

    // Get current month's total
    const { data: currentData, error: currentError } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_amount
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN camps c ON r.camp_id = c.id
       WHERE EXTRACT(YEAR FROM payment_date) = $1
       AND EXTRACT(MONTH FROM payment_date) = $2
       AND c.team_id = $3`,
      [currentYear, currentMonth, teamId]
    )

    if (currentError) {
      throw new Error(`Error getting current month payments: ${String(currentError)}`)
    }

    // Get previous month's total
    const { data: previousData, error: previousError } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as previous_month_total
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN camps c ON r.camp_id = c.id
       WHERE EXTRACT(YEAR FROM payment_date) = $1
       AND EXTRACT(MONTH FROM payment_date) = $2
       AND c.team_id = $3`,
      [currentMonth === 1 ? currentYear - 1 : currentYear, currentMonth === 1 ? 12 : currentMonth - 1, teamId]
    )

    if (previousError) {
      throw new Error(`Error getting previous month payments: ${String(previousError)}`)
    }

    const total = Number(currentData?.[0]?.total_amount) || 0
    const previousTotal = Number(previousData?.[0]?.previous_month_total) || 0
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100

    return {
      total,
      previousTotal,
      percentageChange
    }
  },

  async getMonthlyRegistrations(): Promise<MetricData> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return { total: 0, previousTotal: 0, percentageChange: null }
    }

    // Get current month's total
    const { data: currentData, error: currentError } = await db.query(
      `SELECT COUNT(*) as total_count
       FROM registrations r
       JOIN camps c ON r.camp_id = c.id
       WHERE EXTRACT(YEAR FROM r.created_at) = $1
       AND EXTRACT(MONTH FROM r.created_at) = $2
       AND c.team_id = $3`,
      [currentYear, currentMonth, teamId]
    )

    if (currentError) {
      throw new Error(`Error getting current month registrations: ${String(currentError)}`)
    }

    // Get previous month's total
    const { data: previousData, error: previousError } = await db.query(
      `SELECT COUNT(*) as previous_month_count
       FROM registrations r
       JOIN camps c ON r.camp_id = c.id
       WHERE EXTRACT(YEAR FROM r.created_at) = $1
       AND EXTRACT(MONTH FROM r.created_at) = $2
       AND c.team_id = $3`,
      [currentMonth === 1 ? currentYear - 1 : currentYear, currentMonth === 1 ? 12 : currentMonth - 1, teamId]
    )

    if (previousError) {
      throw new Error(`Error getting previous month registrations: ${String(previousError)}`)
    }

    const total = Number(currentData?.[0]?.total_count) || 0
    const previousTotal = Number(previousData?.[0]?.previous_month_count) || 0
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100

    return {
      total,
      previousTotal,
      percentageChange
    }
  },

  async getMonthlySnackbarTransactions(): Promise<MetricData> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return { total: 0, previousTotal: 0, percentageChange: null }
    }

    // Get current month's total
    const { data: currentData, error: currentError } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_amount
       FROM snackbar_balance sb
       JOIN registrations r ON sb.registration_id = r.id
       JOIN camps camp ON r.camp_id = camp.id
       WHERE EXTRACT(YEAR FROM sb.created_at) = $1
       AND EXTRACT(MONTH FROM sb.created_at) = $2
       AND camp.team_id = $3`,
      [currentYear, currentMonth, teamId]
    )

    if (currentError) {
      throw new Error(`Error getting current month snackbar transactions: ${String(currentError)}`)
    }

    // Get previous month's total
    const { data: previousData, error: previousError } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as previous_month_total
       FROM snackbar_balance sb
       JOIN registrations r ON sb.registration_id = r.id
       JOIN camps camp ON r.camp_id = camp.id
       WHERE EXTRACT(YEAR FROM sb.created_at) = $1
       AND EXTRACT(MONTH FROM sb.created_at) = $2
       AND camp.team_id = $3`,
      [currentMonth === 1 ? currentYear - 1 : currentYear, currentMonth === 1 ? 12 : currentMonth - 1, teamId]
    )

    if (previousError) {
      throw new Error(`Error getting previous month snackbar transactions: ${String(previousError)}`)
    }

    const total = Number(currentData?.[0]?.total_amount) || 0
    const previousTotal = Number(previousData?.[0]?.previous_month_total) || 0
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100

    return {
      total,
      previousTotal,
      percentageChange
    }
  },

  async getYearlyCampers(): Promise<MetricData> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return { total: 0, previousTotal: 0, percentageChange: null }
    }

    // Get current year's total
    const { data: currentData, error: currentError } = await db.query(
      `SELECT COUNT(*) as total_count
       FROM campers c
       JOIN registrations r ON c.registration_id = r.id
       JOIN camps camp ON r.camp_id = camp.id
       WHERE EXTRACT(YEAR FROM c.created_at) = $1
       AND camp.team_id = $2`,
      [currentYear, teamId]
    )

    if (currentError) {
      throw new Error(`Error getting current year campers: ${String(currentError)}`)
    }

    // Get previous year's total
    const { data: previousData, error: previousError } = await db.query(
      `SELECT COUNT(*) as previous_year_count
       FROM campers c
       JOIN registrations r ON c.registration_id = r.id
       JOIN camps camp ON r.camp_id = camp.id
       WHERE EXTRACT(YEAR FROM c.created_at) = $1
       AND camp.team_id = $2`,
      [currentYear - 1, teamId]
    )

    if (previousError) {
      throw new Error(`Error getting previous year campers: ${String(previousError)}`)
    }

    const total = Number(currentData?.[0]?.total_count) || 0
    const previousTotal = Number(previousData?.[0]?.previous_year_count) || 0
    const percentageChange = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100

    return {
      total,
      previousTotal,
      percentageChange
    }
  },

  async getCampPayments(): Promise<CampPaymentsData[]> {
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return []
    }

    const { data, error } = await db.query(
      `SELECT 
        c.id as camp_id,
        c.name as camp_name,
        COUNT(DISTINCT p.id) as total_payments,
        COUNT(DISTINCT r.id) as total_registrations
       FROM camps c
       LEFT JOIN registrations r ON c.id = r.camp_id
       LEFT JOIN payments p ON r.id = p.registration_id
       WHERE c.team_id = $1
       GROUP BY c.id, c.name
       ORDER BY c.created_at DESC`,
      [teamId]
    )

    if (error) {
      throw new Error(`Error getting camp payments: ${String(error)}`)
    }

    return (data as RawCampPaymentsData[]).map(camp => ({
      campId: camp.camp_id,
      campName: camp.camp_name,
      totalPayments: Number(camp.total_payments) || 0,
      totalRegistrations: Number(camp.total_registrations) || 0
    }))
  },

  async getRecentRegistrations(limit: number = 5): Promise<RecentRegistration[]> {
    const teamId = await getCurrentTeamId()
    
    if (!teamId) {
      return []
    }

    const { data, error } = await db.query(
      `SELECT 
        r.id, 
        r.name, 
        r.email, 
        r.created_at,
        c.name as camp_name,
        COALESCE(SUM(p.amount), 0) as total_paid
       FROM registrations r
       JOIN camps c ON r.camp_id = c.id
       LEFT JOIN payments p ON r.id = p.registration_id
       WHERE c.team_id = $1
       GROUP BY r.id, r.name, r.email, r.created_at, c.name
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [teamId, limit]
    )

    if (error) {
      throw new Error(`Error getting recent registrations: ${String(error)}`)
    }

    return (data as RawRecentRegistration[]).map(reg => ({
      id: reg.id,
      name: reg.name,
      email: reg.email,
      totalPaid: Number(reg.total_paid) || 0,
      createdAt: new Date(reg.created_at).toISOString(),
      campName: reg.camp_name
    }))
  }
} 