import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/avatar'
import { dashboardService } from '../services/dashboard-service'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './empty-state'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function RecentSales() {
  const { data: registrations, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'recent-registrations'],
    queryFn: () => dashboardService.getRecentRegistrations(5),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="ml-3 space-y-0.5">
              <Skeleton className="h-3 w-[150px]" />
              <Skeleton className="h-3 w-[120px]" />
              <Skeleton className="h-2 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState 
        variant="alert"
        title="Erro"
        description="Não foi possível carregar as inscrições recentes."
      />
    )
  }

  if (!registrations || registrations.length === 0) {
    return (
      <EmptyState 
        variant="alert"
        title="Sem inscrições recentes"
        description="Não existem inscrições recentes."
      />
    )
  }

  return (
    <div className="space-y-3">
      {registrations.map((registration) => (
        <div key={registration.id} className="flex items-center text-xs">
          <Avatar className="h-7 w-7">
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs">
              {getInitials(registration.name)}
            </div>
          </Avatar>
          <div className="ml-2 space-y-0.5">
            <p className="font-medium leading-none">{registration.name}</p>
            <p className="text-muted-foreground text-xs">{registration.email}</p>
            <p className="text-muted-foreground text-xs">{registration.campName}</p>
          </div>
          <div className="ml-auto font-medium">
            {formatCurrency(registration.totalPaid)}
          </div>
        </div>
      ))}
    </div>
  )
}
