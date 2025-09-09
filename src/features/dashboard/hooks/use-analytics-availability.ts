import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { dashboardService } from '../services/dashboard-service'

export function useAnalyticsAvailability() {
  const { data: totalRegistrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['dashboard', 'total-registrations'],
    queryFn: () => dashboardService.getTotalRegistrations()
  })

  const { data: campPayments, isLoading: isLoadingCamps } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  const isLoading = isLoadingRegistrations || isLoadingCamps

  // Verifica se há dados suficientes para mostrar analytics
  const hasAnalyticsData = useMemo(() => {
    if (isLoading) return false
    
    // Verifica se há inscrições
    const hasRegistrations = (totalRegistrations?.total || 0) > 0
    
    // Verifica se há acampamentos com dados
    const hasCampsWithData = (campPayments?.length || 0) > 0
    
    return hasRegistrations && hasCampsWithData
  }, [totalRegistrations, campPayments, isLoading])

  return {
    hasAnalyticsData,
    isLoading,
    totalRegistrations: totalRegistrations?.total || 0,
    totalCamps: campPayments?.length || 0
  }
}
