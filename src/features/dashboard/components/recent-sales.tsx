import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/avatar'
import { dashboardService } from '../services/dashboard-service'
import { Skeleton } from '@/components/ui/skeleton'

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
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['dashboard', 'recent-registrations'],
    queryFn: () => dashboardService.getRecentRegistrations(5)
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="ml-4 space-y-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {registrations?.map((registration) => (
        <div key={registration.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
              {getInitials(registration.name)}
            </div>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{registration.name}</p>
            <p className="text-sm text-muted-foreground">{registration.email}</p>
          </div>
          <div className="ml-auto font-medium">
            {formatCurrency(registration.totalPaid)}
          </div>
        </div>
      ))}
    </div>
  )
}
