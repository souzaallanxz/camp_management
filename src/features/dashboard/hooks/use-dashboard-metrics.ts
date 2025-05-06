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

  // Função para carregar todos os dados de uma única vez
  const fetchAllData = useCallback(async (): Promise<DashboardData> => {
    const data = await dashboardService.getDashboardData()
    return data
  }, [])

  // Usar uma única query para todos os dados
  const { data, isLoading, error, refetch } = useQuery<DashboardData, Error>({
    queryKey: ['dashboard', 'all-data', timestamp],
    queryFn: fetchAllData,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
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