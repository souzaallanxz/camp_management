import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false

  const { data: totalPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'total-payments'],
    queryFn: () => dashboardService.getTotalPayments(),
    enabled,
  })

  const { data: totalRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'total-registrations'],
    queryFn: () => dashboardService.getTotalRegistrations(),
    enabled,
  })

  const { data: totalSnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'total-snackbar'],
    queryFn: () => dashboardService.getTotalSnackbarTransactions(),
    enabled,
  })

  const { data: totalCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'total-campers'],
    queryFn: () => dashboardService.getTotalCampers(),
    enabled,
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