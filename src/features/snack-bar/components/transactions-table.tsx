import { format } from 'date-fns'
import type { SnackBarTransactionResponse } from '../data/schema'
import { DataTable } from '@/components/ui/data-table'
import { type ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<SnackBarTransactionResponse>[] = [
  {
    accessorKey: 'created_at',
    header: 'Data',
    size: 180,
    cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm'),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Valor</div>,
    size: 100,
    cell: ({ row }) => {
      const amount = row.original.amount
      const formattedAmount = typeof amount === 'number' 
        ? amount.toFixed(2) 
        : parseFloat(String(amount))?.toFixed(2) || '0.00'
      
      return (
        <div className="text-right tabular-nums font-medium">
          € {formattedAmount}
        </div>
      )
    },
  },
]

interface TransactionsTableProps {
  data: SnackBarTransactionResponse[]
}

export function TransactionsTable({ data }: TransactionsTableProps) {
  return (
    <div className="max-h-[400px] overflow-auto">
      <DataTable 
        columns={columns} 
        data={data}
        emptyMessage="Sem transações para exibir"
      />
    </div>
  )
} 