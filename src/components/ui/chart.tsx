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
          '--color-totalPayments': config.totalPayments?.color,
          '--color-totalRegistrations': config.totalRegistrations?.color,
          '--color-inscricoes': config.inscricoes?.color,
          '--color-pagamentos': config.pagamentos?.color,
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
    fill?: string
    payload: {
      [key: string]: any
    }
  }>
  labelKey?: string
  nameKey?: string
  valueFormatter?: (value: number) => string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
}

export function ChartTooltipContent({
  active,
  payload,
  labelKey,
  nameKey,
  valueFormatter = (value) => String(value),
  hideLabel = false,
  hideIndicator = false,
  indicator = "line",
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  const tooltipLabel = hideLabel ? null : (
    <div className="font-medium">{payload[0].payload[nameKey || 'name'] || 'Valor'}</div>
  )

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl transition-all ease-in-out hover:-translate-y-0.5">
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const indicatorColor = item.fill || "#8884d8"

          return (
            <div
              key={index}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center"
              )}
            >
              <>
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": nestLabel && indicator === "dashed",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    nestLabel ? "items-end" : "items-center"
                  )}
                >
                  <div className="grid gap-1.5">
                    {nestLabel ? tooltipLabel : null}
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {valueFormatter(item.value)}
                  </span>
                </div>
              </>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} cursor={{ fill: 'transparent' }} />
}

interface ChartLegendContentProps {
  config: ChartConfig
  nameKey?: string
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
}

export function ChartLegendContent({
  config,
  nameKey = "name",
  hideIndicator = false,
  indicator = "line",
}: ChartLegendContentProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {Object.entries(config).map(([key, item]) => (
        <div key={key} className="flex items-center gap-2">
          {!hideIndicator && (
            <div
              className={cn(
                "shrink-0 rounded-[2px]",
                {
                  "h-2.5 w-2.5": indicator === "dot",
                  "w-1": indicator === "line",
                  "w-0 border-[1.5px] border-dashed": indicator === "dashed",
                }
              )}
              style={{
                backgroundColor: item.color,
                borderColor: item.color,
              }}
            />
          )}
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartLegend({ content, ...props }: { content: any } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex items-center justify-center" {...props}>
      {content}
    </div>
  )
} 