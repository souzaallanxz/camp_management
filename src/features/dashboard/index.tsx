import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'
import { useDashboardMetrics } from './hooks/use-dashboard-metrics'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { useState } from 'react'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from './components/empty-state'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

function MetricCard({
  title,
  value,
  percentageChange = null,
  icon,
  isLoading,
  valueFormatter = (val: number) => String(val),
  isLocked = false,
}: {
  title: string
  value: number
  percentageChange?: number | null
  icon: React.ReactNode
  isLoading: boolean
  valueFormatter?: (value: number) => string
  isLocked?: boolean
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className='h-8 w-[100px] mb-1' />
            <Skeleton className='h-4 w-[140px]' />
          </>
        ) : isLocked ? (
          <div className='flex items-center'>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">Premium Feature</Badge>
          </div>
        ) : (
          <>
            <div className='text-2xl font-bold'>{valueFormatter(value)}</div>
            {percentageChange !== null && (
              <p className={`text-xs ${percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% face ao {title === 'Total de Campistas' ? 'ano' : 'mês'} anterior
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { totalPayments, totalRegistrations, totalSnackbar, totalCampers, isLoading, error } = useDashboardMetrics()
  const permissions = useTeamPermissions()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
          </div>
        </div>

        {error && (
          <EmptyState
            variant="card"
            title="Erro ao carregar dados"
            description="Não foi possível carregar os dados do dashboard. Tente novamente mais tarde."
          />
        )}

        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics' disabled>
                Analytics
              </TabsTrigger>
              <TabsTrigger value='reports' disabled>
                Reports
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <MetricCard
                title='Total Pagamentos'
                value={totalPayments?.total || 0}
                isLoading={isLoading}
                valueFormatter={formatCurrency}
                icon={
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                }
              />
              <MetricCard
                title='Total de Inscrições'
                value={totalRegistrations?.total || 0}
                isLoading={isLoading}
                icon={
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                }
              />
              <MetricCard
                title='Total de Carregamentos'
                value={totalSnackbar?.total || 0}
                isLoading={isLoading}
                valueFormatter={formatCurrency}
                isLocked={!permissions.dashboard.viewRechargesTotal}
                icon={
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                }
              />
              <MetricCard
                title='Total de Campistas'
                value={totalCampers?.total || 0}
                isLoading={isLoading}
                icon={
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                }
              />
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              {permissions.dashboard.viewOverview && (
                <Card className='col-span-1 lg:col-span-4'>
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className='pl-2'>
                    <Overview />
                  </CardContent>
                </Card>
              )}
              {permissions.dashboard.viewLatestRegistrations && (
                <Card className='col-span-1 lg:col-span-3'>
                  <CardHeader>
                    <CardTitle>Últimas Inscrições</CardTitle>
                    <CardDescription>
                      {totalRegistrations?.total || 0} inscrições no total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Main>

      <TierUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: '/',
    isActive: true,
    disabled: false,
  },
  /*{
    title: 'Customers',
    href: 'dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Products',
    href: 'dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Settings',
    href: 'settings/prodf',
    isActive: false,
    disabled: true,
  },*/
]
