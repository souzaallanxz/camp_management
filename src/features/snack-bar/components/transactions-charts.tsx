import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SnackBarTransactionResponse } from '../data/schema'

interface TransactionsChartsProps {
  data: SnackBarTransactionResponse[]
  currentCamp?: {
    id: string
    name: string
  }
}

export function TransactionsCharts({ data }: TransactionsChartsProps) {
  // Group transactions by day
  const transactionsByDay = data.reduce((acc, transaction) => {
    const day = format(new Date(transaction.created_at), 'dd/MM', { locale: ptBR })
    acc[day] = (acc[day] || 0) + Number(transaction.amount)
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(transactionsByDay).map(([date, amount]) => ({
    date,
    total: amount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por Dia</CardTitle>
        <CardDescription>
          Histórico de vendas durante o acampamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
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
                tickFormatter={(value) => `€${value}`}
              />
              <Bar
                dataKey="total"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Sem dados de transações disponíveis.
          </div>
        )}
      </CardContent>
    </Card>
  )
} 