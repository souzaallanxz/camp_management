import { type ColumnDef } from '@tanstack/react-table'
import { type Camper } from '../data/schema'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import LongText from '@/components/long-text'
import { Button } from '@/components/ui/button'
import { IconEdit, IconDotsVertical, IconCreditCard } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'

interface CamperWithActions extends Camper {
  onEdit?: (camper: Camper) => void
  onLoadCard?: (camper: Camper) => void
  total_balance: number
}

export const columns: ColumnDef<CamperWithActions>[] = [
  {
    accessorKey: 'form_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Form ID" />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: 'contact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contacto" />
    ),
  },
  {
    accessorKey: 'camp',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acampamento" />
    ),
  },
  {
    accessorKey: 'total_balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo" />
    ),
    cell: ({ row }) => {
      const balance = row.original.total_balance
      return (
        <div className={`font-medium ${balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(balance)}
        </div>
      )
    },
  },
  {
    accessorKey: 'additional_notes',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notas" />
    ),
    cell: ({ row }) => {
      const notes = row.getValue('additional_notes') as string
      return notes ? <LongText>{notes}</LongText> : null
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const camper = row.original

      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
            >
              <IconDotsVertical className='h-4 w-4' />
              <span className='sr-only'>Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-[160px]'>
            <DropdownMenuItem
              onClick={() => camper.onEdit?.(camper)}
              className='flex items-center'
            >
              Editar
              <DropdownMenuShortcut>
                <IconEdit size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => camper.onLoadCard?.(camper)}
              className='flex items-center'
            >
              Carregar cartão
              <DropdownMenuShortcut>
                <IconCreditCard size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
] 