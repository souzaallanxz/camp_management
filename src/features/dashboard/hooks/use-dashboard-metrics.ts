import { useQuery } from '@tanstack/react-query'
import { dashboardService, MetricData, CampPaymentsData, RecentRegistration } from '../services/dashboard-service'
import { useState, useCallback } from 'react'

interface DashboardData {
  monthlyPayments: MetricData;
  monthlyRegistrations: MetricData;
  monthlySnackbar: MetricData;
  yearlyCampers: MetricData;
  campPayments: CampPaymentsData[];
  recentRegistrations: RecentRegistration[];
}

export function useDashboardMetrics() {
  // Usar um timestamp estável durante a montagem do componente
  const [timestamp] = useState(() => Date.now())

  // Função para carregar todos os dados ao mesmo tempo
  const fetchAllData = useCallback(async (): Promise<DashboardData> => {
    const [
      monthlyPayments,
      monthlyRegistrations,
      monthlySnackbar,
      yearlyCampers,
      campPayments,
      recentRegistrations
    ] = await Promise.all([
      dashboardService.getMonthlyPayments(),
      dashboardService.getMonthlyRegistrations(),
      dashboardService.getMonthlySnackbarTransactions(),
      dashboardService.getYearlyCampers(),
      dashboardService.getCampPayments(),
      dashboardService.getRecentRegistrations(5)
    ])

    return {
      monthlyPayments,
      monthlyRegistrations,
      monthlySnackbar,
      yearlyCampers,
      campPayments,
      recentRegistrations
    }
  }, [])

  // Usar uma única query para todos os dados
  const { data, isLoading, error, refetch } = useQuery<DashboardData, Error>({
    queryKey: ['dashboard', 'all-data', timestamp],
    queryFn: fetchAllData,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  return {
    monthlyPayments: data?.monthlyPayments,
    monthlyRegistrations: data?.monthlyRegistrations,
    monthlySnackbar: data?.monthlySnackbar,
    yearlyCampers: data?.yearlyCampers,
    campPayments: data?.campPayments,
    recentRegistrations: data?.recentRegistrations,
    isLoading,
    error,
    refetch
  }
} 