import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics() {
  const { data: monthlyPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'monthly-payments'],
    queryFn: () => dashboardService.getMonthlyPayments(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: monthlyRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'monthly-registrations'],
    queryFn: () => dashboardService.getMonthlyRegistrations(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: monthlySnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'monthly-snackbar'],
    queryFn: () => dashboardService.getMonthlySnackbarTransactions(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: yearlyCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'yearly-campers'],
    queryFn: () => dashboardService.getYearlyCampers(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
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