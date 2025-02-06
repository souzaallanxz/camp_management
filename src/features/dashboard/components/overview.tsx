import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, TooltipProps } from 'recharts'
import { dashboardService, CampPaymentsData } from '../services/dashboard-service'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: Array<{
    value: number
    payload: CampPaymentsData
  }>
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <Card className="p-2 bg-background border shadow-lg">
        <div className="grid gap-2">
          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
            {data.campName}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">Total Pagamentos</span>
            <span className="ml-auto text-sm font-medium">{formatCurrency(data.totalPayments)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <span className="text-sm font-medium">Total Inscrições</span>
            <span className="ml-auto text-sm font-medium">{data.totalRegistrations}</span>
          </div>
        </div>
      </Card>
    )
  }

  return null
}

export function Overview() {
  const { data: campPayments, isLoading } = useQuery({
    queryKey: ['dashboard', 'camp-payments'],
    queryFn: () => dashboardService.getCampPayments()
  })

  if (isLoading) {
    return <Skeleton className="w-full h-[350px]" />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={campPayments}>
        <XAxis
          dataKey="campName"
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
          tickFormatter={(value) => `${formatCurrency(value)}`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'transparent' }}
        />
        <Bar
          dataKey="totalPayments"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
