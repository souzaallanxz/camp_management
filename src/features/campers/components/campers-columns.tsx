import { type ColumnDef } from '@tanstack/react-table'
import { type Camper } from '../data/schema'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import LongText from '@/components/long-text'
import { Button } from '@/components/ui/button'
import { IconEdit, IconDotsVertical, IconCreditCard, IconCash } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface CamperWithActions extends Omit<Camper, 'camp'> {
  onEdit?: (camper: Camper) => void
  onLoadCard?: (camper: Camper) => void
  onUpgradeClick?: () => void
  onLiquidateSnackbar?: (camper: Camper) => void
  snack_bar_balance?: string | number
  total_balance: number
  camp?: string | { name?: string }
  payment_status?: string
}

export const columns: ColumnDef<CamperWithActions>[] = [
  {
    accessorKey: 'form_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Form ID" />
    ),
    cell: ({ row }) => row.getValue('form_id') || '-'
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
    accessorKey: 'camp_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acampamento" />
    ),
    cell: ({ row }) => row.getValue('camp_name') || '-',
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const campName = row.getValue(id);
      return Array.isArray(value) ? value.includes(campName) : false;
    }
  },
  {
    accessorKey: 'snack_bar_balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo" />
    ),
    cell: ({ row }) => {
      const balance = Number(row.original.snack_bar_balance) || 0
      const payment_status = row.original.payment_status || 'confirmed'
      
      // New color logic based on balance and payment status
      let colorClass = 'text-red-600' // Default: red for balance = 0
      if (balance > 0) {
        if (payment_status === 'confirmed') {
          colorClass = 'text-green-600' // Green: balance > 0 and confirmed
        } else {
          colorClass = 'text-yellow-600' // Yellow: balance > 0 and not confirmed
        }
      }
      
      return (
        <div className={`font-medium ${colorClass}`}>
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
      return notes ? <LongText>{notes}</LongText> : '-'
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const camper = row.original
      const permissions = useTeamPermissions()

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
              onClick={() => camper.onEdit?.(camper as Camper)}
              className='flex items-center'
            >
              Editar
              <DropdownMenuShortcut>
                <IconEdit size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    onClick={() => permissions.campers.rechargeCard ? camper.onLoadCard?.(camper as Camper) : camper.onUpgradeClick?.()}
                    className='flex items-center'
                    disabled={!permissions.campers.rechargeCard}
                  >
                    Carregar cartão
                    <DropdownMenuShortcut>
                      <IconCreditCard size={16} />
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!permissions.campers.rechargeCard && (
                  <TooltipContent>
                    <p>Disponível apenas no plano Premium</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenuItem
              onClick={() => camper.onLiquidateSnackbar?.(camper as Camper)}
              className='flex items-center'
              disabled={!camper.snack_bar_balance || Number(camper.snack_bar_balance) <= 0}
            >
              Liquidar Snackbar
              <DropdownMenuShortcut>
                <IconCash size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
] 