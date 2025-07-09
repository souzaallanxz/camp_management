import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics() {
  const { data: totalPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'total-payments'],
    queryFn: () => dashboardService.getTotalPayments()
  })

  const { data: totalRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'total-registrations'],
    queryFn: () => dashboardService.getTotalRegistrations()
  })

  const { data: totalSnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'total-snackbar'],
    queryFn: () => dashboardService.getTotalSnackbarTransactions()
  })

  const { data: totalCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'total-campers'],
    queryFn: () => dashboardService.getTotalCampers()
  })

  const isLoading = isLoadingPayments || isLoadingRegistrations || isLoadingSnackbar || isLoadingCampers
  const error = paymentsError || registrationsError || snackbarError || campersError

  return {
    totalPayments,
    totalRegistrations,
    totalSnackbar,
    totalCampers,
    isLoading,
    error
  }
} 