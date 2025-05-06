import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'

export function useDashboardMetrics() {
  const { data: monthlyPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'monthly-payments', Date.now()],
    queryFn: () => dashboardService.getMonthlyPayments(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  })

  const { data: monthlyRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'monthly-registrations', Date.now()],
    queryFn: () => dashboardService.getMonthlyRegistrations(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  })

  const { data: monthlySnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'monthly-snackbar', Date.now()],
    queryFn: () => dashboardService.getMonthlySnackbarTransactions(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  })

  const { data: yearlyCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'yearly-campers', Date.now()],
    queryFn: () => dashboardService.getYearlyCampers(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
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