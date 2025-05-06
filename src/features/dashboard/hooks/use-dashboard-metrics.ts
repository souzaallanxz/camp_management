import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'
import { useState } from 'react'

export function useDashboardMetrics() {
  // Usar um timestamp estável durante a montagem do componente
  const [timestamp] = useState(() => Date.now())

  const { data: monthlyPayments, isLoading: isLoadingPayments, error: paymentsError } = useQuery({
    queryKey: ['dashboard', 'monthly-payments', timestamp],
    queryFn: () => dashboardService.getMonthlyPayments(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  })

  const { data: monthlyRegistrations, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['dashboard', 'monthly-registrations', timestamp],
    queryFn: () => dashboardService.getMonthlyRegistrations(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  })

  const { data: monthlySnackbar, isLoading: isLoadingSnackbar, error: snackbarError } = useQuery({
    queryKey: ['dashboard', 'monthly-snackbar', timestamp],
    queryFn: () => dashboardService.getMonthlySnackbarTransactions(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  })

  const { data: yearlyCampers, isLoading: isLoadingCampers, error: campersError } = useQuery({
    queryKey: ['dashboard', 'yearly-campers', timestamp],
    queryFn: () => dashboardService.getYearlyCampers(),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
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