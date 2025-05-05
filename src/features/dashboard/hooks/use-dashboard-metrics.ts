import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics() {
  const { data: monthlyPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'monthly-payments'],
    queryFn: () => dashboardService.getMonthlyPayments()
  })

  const { data: monthlyRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'monthly-registrations'],
    queryFn: () => dashboardService.getMonthlyRegistrations()
  })

  const { data: monthlySnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'monthly-snackbar'],
    queryFn: () => dashboardService.getMonthlySnackbarTransactions()
  })

  const { data: yearlyCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'yearly-campers'],
    queryFn: () => dashboardService.getYearlyCampers()
  })

  const isLoading = isLoadingPayments || isLoadingRegistrations || isLoadingSnackbar || isLoadingCampers
  const error = paymentsError || registrationsError || snackbarError || campersError

  return {
    monthlyPayments,
    monthlyRegistrations,
    monthlySnackbar,
    yearlyCampers,
    isLoading,
    error
  }
} 