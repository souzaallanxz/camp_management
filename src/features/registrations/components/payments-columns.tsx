import { ColumnDef } from '@tanstack/react-table'
import { Payment } from '../data/schema'
import { formatCurrency } from '@/lib/utils'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Badge } from '@/components/ui/badge'

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'payment_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Date' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('payment_date'))
      return date.toLocaleDateString()
    }
  },
  {
    accessorKey: 'payment_method',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Method' />
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Amount' />
    ),
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number
      return formatCurrency(amount)
    }
  },
  {
    accessorKey: 'payment_status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.payment_status
      const statusStyles = {
        confirmed: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
        'not confirmed': 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
      }

      return (
        <Badge className={statusStyles[status]}>
          {status === 'confirmed' ? 'Confirmado' : 'Pendente'}
        </Badge>
      )
    },
  },
] 