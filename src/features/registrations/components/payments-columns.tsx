import { ColumnDef } from '@tanstack/react-table'
import { Payment } from '../data/schema'
import { formatCurrency } from '@/lib/utils'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

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
] 