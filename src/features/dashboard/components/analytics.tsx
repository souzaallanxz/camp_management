import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard-service'
import { integrationsService } from '@/features/settings/services/integrations-service'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, LineChart, Line, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'


function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

function AnalyticsMetricCard({
  title,
  value,
  subtitle,
  icon,
  isLoading,
  valueFormatter = (val: number) => String(val),
}: {
  title: string
  value: number
  subtitle?: string
  icon: React.ReactNode
  isLoading: boolean
  valueFormatter?: (value: number) => string
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className='h-8 w-[100px] mb-1' />
            <Skeleton className='h-4 w-[140px]' />
          </>
        ) : (
          <>
            <div className='text-2xl font-bold'>{valueFormatter(value)}</div>
            {subtitle && (
              <p className='text-xs text-muted-foreground'>{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CampPaymentsChart({ isLoading }: { isLoading: boolean }) {
  const { data: campPayments, isLoading: isLoadingData } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      value: number
      payload: {
        inscricoes: number
        snackbar: number
        total: number
      }
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      

      
      return (
        <Card className="p-2 bg-background border shadow-lg">
          <div className="grid gap-2">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-sm font-medium">Inscrições</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.inscricoes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="text-sm font-medium">Snackbar</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.snackbar)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-medium">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  if (isLoading || isLoadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita Total por Acampamento</CardTitle>
          <CardDescription>Divisão entre inscrições pagas e snackbar por acampamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = campPayments?.map(camp => {
    const inscricoes = camp.totalPayments || 0
    const snackbar = camp.totalSnackbar || 0
    const total = inscricoes + snackbar
    
    return {
      name: camp.campName,
      inscricoes,
      snackbar,
      total
    }
  }) || []

  const chartConfig = {
    inscricoes: {
      label: "Inscrições",
      color: "#3b82f6",
    },
    snackbar: {
      label: "Snackbar",
      color: "#10b981",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita Total por Acampamento</CardTitle>
        <CardDescription>Divisão entre inscrições pagas e snackbar por acampamento</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={80}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="inscricoes"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Inscrições"
              />
              <Bar
                dataKey="snackbar"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Snackbar"
              />
            </BarChart>
          </ResponsiveContainer>
          {/* <ChartLegend
            content={<ChartLegendContent config={chartConfig} />}
            className="mt-4"
          /> */}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RegistrationsTrendChart({ isLoading }: { isLoading: boolean }) {
  // Dados mockados para demonstração - em produção viriam da API
  const mockData = [
    { month: 'Jan', inscricoes: 45, pagamentos: 38 },
    { month: 'Fev', inscricoes: 52, pagamentos: 45 },
    { month: 'Mar', inscricoes: 38, pagamentos: 32 },
    { month: 'Abr', inscricoes: 65, pagamentos: 58 },
    { month: 'Mai', inscricoes: 72, pagamentos: 65 },
    { month: 'Jun', inscricoes: 89, pagamentos: 78 },
  ]

  const chartConfig = {
    inscricoes: {
      label: "Inscrições",
      color: "hsl(var(--chart-1))",
    },
    pagamentos: {
      label: "Pagamentos",
      color: "hsl(var(--chart-2))",
    },
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      value: number
      dataKey: string
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 bg-background border shadow-lg">
          <div className="grid gap-2">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
              {label}
            </span>
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: entry.dataKey === 'inscricoes' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }}
                />
                <span className="text-sm font-medium">
                  {entry.dataKey === 'inscricoes' ? 'Inscrições' : 'Pagamentos'}
                </span>
                <span className="ml-auto text-sm font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Inscrições</CardTitle>
          <CardDescription>Evolução mensal das inscrições e pagamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Inscrições</CardTitle>
        <CardDescription>Evolução mensal das inscrições e pagamentos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={mockData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
              />
              <Line 
                type="monotone" 
                dataKey="inscricoes" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="Inscrições"
                dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--chart-1))", strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="pagamentos" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Pagamentos"
                dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--chart-2))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* <ChartLegend
            content={<ChartLegendContent config={chartConfig} />}
            className="mt-4"
          /> */}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function SnackbarProfitChart({ isLoading }: { isLoading: boolean }) {
  const { data: campPayments } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  const { data: mbwayIntegration, isLoading: isLoadingMBWay } = useQuery({
    queryKey: ['integrations', 'mbway'],
    queryFn: () => integrationsService.getMBWayIntegration()
  })

  const isMBWayActive = mbwayIntegration?.is_active ?? false

  // Função para calcular as taxas MBWay
  const calculateMBWayFees = (amount: number) => {
    const fixedFee = 0.07 // Taxa fixa de 0.07€
    const percentageFee = amount * 0.007 // 0.7% sobre o valor total
    return fixedFee + percentageFee
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      value: number
      payload: {
        totalCarregamentos: number
        totalTaxas: number
        totalLiquidado: number
        lucroReal: number
      }
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <Card className="p-2 bg-background border shadow-lg">
          <div className="grid gap-2">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-sm font-medium">Total Carregamentos</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalCarregamentos)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-sm font-medium">Taxas MBWay</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalTaxas)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="text-sm font-medium">Valores Liquidados</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalLiquidado)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lucro Real</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(data.lucroReal)}</span>
              </div>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  if (isLoading || isLoadingMBWay) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lucro Real do Snackbar</CardTitle>
          <CardDescription>Total de carregamentos e taxas MBWay por acampamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se MBWay não estiver ativo, não mostrar o gráfico
  if (!isMBWayActive) {
    return null
  }

  const chartData = campPayments?.map(camp => {
    const totalCarregamentos = camp.totalSnackbar || 0
    const totalLiquidado = camp.totalLiquidated || 0
    const totalTaxas = calculateMBWayFees(totalCarregamentos)
    const lucroReal = totalCarregamentos - totalTaxas - totalLiquidado
    
    
    return {
      name: camp.campName,
      totalCarregamentos,
      totalTaxas,
      totalLiquidado,
      lucroReal
    }
  }) || []

  const chartConfig = {
    totalCarregamentos: {
      label: "Total Carregamentos",
      color: "#3b82f6",
    },
    totalTaxas: {
      label: "Taxas MBWay",
      color: "#ef4444",
    },
    totalLiquidado: {
      label: "Valores Liquidados",
      color: "#f59e0b",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lucro Real do Snackbar</CardTitle>
        <CardDescription>Total de carregamentos e taxas MBWay por acampamento</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={80}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="totalCarregamentos"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Total Carregamentos"
              />
              <Bar
                dataKey="totalTaxas"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Taxas MBWay"
              />
              <Bar
                dataKey="totalLiquidado"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Valores Liquidados"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RegistrationsProfitChart({ isLoading }: { isLoading: boolean }) {
  const { data: campPayments } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  const { data: mbwayIntegration, isLoading: isLoadingMBWay } = useQuery({
    queryKey: ['integrations', 'mbway'],
    queryFn: () => integrationsService.getMBWayIntegration()
  })

  const isMBWayActive = mbwayIntegration?.is_active ?? false

  // Função para calcular as taxas MBWay
  const calculateMBWayFees = (amount: number) => {
    const fixedFee = 0.07 // Taxa fixa de 0.07€
    const percentageFee = amount * 0.007 // 0.7% sobre o valor total
    return fixedFee + percentageFee
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      value: number
      payload: {
        totalInscricoes: number
        totalTaxas: number
        lucroReal: number
      }
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <Card className="p-2 bg-background border shadow-lg">
          <div className="grid gap-2">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
              {label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-sm font-medium">Total Inscrições</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalInscricoes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-sm font-medium">Taxas MBWay</span>
              <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalTaxas)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lucro Real</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(data.lucroReal)}</span>
              </div>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  if (isLoading || isLoadingMBWay) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lucro Real das Inscrições</CardTitle>
          <CardDescription>Total de inscrições e taxas MBWay por acampamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se MBWay não estiver ativo, não mostrar o gráfico
  if (!isMBWayActive) {
    return null
  }

  const chartData = campPayments?.map(camp => {
    const totalInscricoes = camp.totalPayments || 0
    const totalTaxas = calculateMBWayFees(totalInscricoes)
    const lucroReal = totalInscricoes - totalTaxas
    
    return {
      name: camp.campName,
      totalInscricoes,
      totalTaxas,
      lucroReal
    }
  }) || []

  const chartConfig = {
    totalInscricoes: {
      label: "Total Inscrições",
      color: "#3b82f6",
    },
    totalTaxas: {
      label: "Taxas MBWay",
      color: "#ef4444",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lucro Real das Inscrições</CardTitle>
        <CardDescription>Total de inscrições e taxas MBWay por acampamento</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={80}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="totalInscricoes"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Total Inscrições"
              />
              <Bar
                dataKey="totalTaxas"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                stackId="a"
                name="Taxas MBWay"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function Analytics({ isLoading }: { isLoading: boolean }) {
  const { data: mbwayIntegration } = useQuery({
    queryKey: ['integrations', 'mbway'],
    queryFn: () => integrationsService.getMBWayIntegration()
  })

  const { data: totalRegistrations } = useQuery({
    queryKey: ['dashboard', 'total-registrations'],
    queryFn: () => dashboardService.getTotalRegistrations()
  })

  const { data: totalPayments } = useQuery({
    queryKey: ['dashboard', 'total-payments'],
    queryFn: () => dashboardService.getTotalPayments()
  })

  const { data: campPayments } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  const isMBWayActive = mbwayIntegration?.is_active ?? false

  // Calcular métricas reais
  const totalCamps = campPayments?.length || 0
  const totalRegistrationsCount = totalRegistrations?.total || 0
  const averageRegistrations = totalCamps > 0 ? Math.round(totalRegistrationsCount / totalCamps) : 0
  const conversionRate = totalRegistrationsCount > 0 ? ((totalPayments?.total || 0) / totalRegistrationsCount) * 100 : 0
  const totalRevenue = totalPayments?.total || 0

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsMetricCard
          title="Total de Acampamentos"
          value={totalCamps}
          subtitle="Ativos no sistema"
          isLoading={isLoading}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          }
        />
        <AnalyticsMetricCard
          title="Média de Inscrições"
          value={averageRegistrations}
          subtitle="Por acampamento"
          isLoading={isLoading}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <AnalyticsMetricCard
          title="Taxa de Conversão"
          value={conversionRate}
          subtitle="Inscrições para pagamentos"
          isLoading={isLoading}
          valueFormatter={(val) => `${val.toFixed(1)}%`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <AnalyticsMetricCard
          title="Receita Total"
          value={totalRevenue}
          subtitle="Este ano"
          isLoading={isLoading}
          valueFormatter={formatCurrency}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M6 12h12M6 12c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" />
              <path d="M6 12c0 3.314 2.686 6 6 6s6-2.686 6-6" />
            </svg>
          }
        />
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CampPaymentsChart isLoading={isLoading} />
        <RegistrationsTrendChart isLoading={isLoading} />
      </div>

      {/* Gráficos de Lucro - só aparecem se MBWay estiver ativo */}
      {isMBWayActive && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SnackbarProfitChart isLoading={isLoading} />
          <RegistrationsProfitChart isLoading={isLoading} />
        </div>
      )}
    </div>
  )
}
