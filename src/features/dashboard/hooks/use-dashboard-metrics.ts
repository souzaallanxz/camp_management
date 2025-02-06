import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics() {
  const { data: monthlyPayments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['dashboard', 'monthly-payments'],
    queryFn: () => dashboardService.getMonthlyPayments()
  })

  const { data: monthlyRegistrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['dashboard', 'monthly-registrations'],
    queryFn: () => dashboardService.getMonthlyRegistrations()
  })

  const { data: monthlySnackbar, isLoading: isLoadingSnackbar } = useQuery({
    queryKey: ['dashboard', 'monthly-snackbar'],
    queryFn: () => dashboardService.getMonthlySnackbarTransactions()
  })

  const { data: yearlyCampers, isLoading: isLoadingCampers } = useQuery({
    queryKey: ['dashboard', 'yearly-campers'],
    queryFn: () => dashboardService.getYearlyCampers()
  })

  const isLoading = isLoadingPayments || isLoadingRegistrations || isLoadingSnackbar || isLoadingCampers

  return {
    monthlyPayments,
    monthlyRegistrations,
    monthlySnackbar,
    yearlyCampers,
    isLoading
  }
} 