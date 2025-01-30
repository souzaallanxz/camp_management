import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { type Camp } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

export const columns: ColumnDef<Camp>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: 'start_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de Início" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('start_date')
      return <div>{formatDate(date as string)}</div>
    },
  },
  {
    accessorKey: 'end_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de Fim" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('end_date')
      return <div>{formatDate(date as string)}</div>
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor" />
    ),
    cell: ({ row }) => {
      const price = row.getValue('price')
      return <div>{formatCurrency(price as number)}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
] 