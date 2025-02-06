import { cn } from '@/lib/utils'
import { Tooltip as RechartsTooltip } from 'recharts'
import { Card } from './card'

interface ChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <div
      className={cn('h-full w-full', className)}
      style={
        {
          '--color-totalPayments': config.totalPayments.color,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    payload: {
      [key: string]: any
    }
  }>
  labelKey: string
  nameKey: string
  valueFormatter?: (value: number) => string
}

export function ChartTooltipContent({
  active,
  payload,
  labelKey,
  nameKey,
  valueFormatter = (value) => String(value),
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <Card className="p-3 bg-background border shadow-lg">
      <p className="font-medium">{data[nameKey]}</p>
      <p className="text-sm text-muted-foreground">
        {payload[0].name}: {valueFormatter(payload[0].value)}
      </p>
      {labelKey !== 'totalRegistrations' && (
        <p className="text-sm text-muted-foreground">
          Total Inscrições: {data.totalRegistrations}
        </p>
      )}
    </Card>
  )
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} cursor={{ fill: 'transparent' }} />
} 