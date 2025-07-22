import { type ColumnDef } from '@tanstack/react-table'
import { type Staff } from '../data/schema'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Button } from '@/components/ui/button'
import { IconEdit, IconDotsVertical, IconCreditCard, IconAlertTriangle, IconCash } from '@tabler/icons-react'
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

export interface StaffWithActions extends Staff {
  onEdit?: (staff: Staff) => void
  onLoadCard?: (staff: Staff) => void
  onUpgradeClick?: () => void
  onLiquidateSnackbar?: (staff: Staff) => void
  total_balance: number
  payment_status?: string
  snack_bar_balance?: string | number;
  totalLoaded?: number;
  totalSpent?: number;
  totalLiquidated?: number;
}

export const columns: ColumnDef<StaffWithActions>[] = [
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
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone" />
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
    accessorKey: 'totalLoaded',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo Carregado" />
    ),
    cell: ({ row }) => {
      const totalLoaded = Number(row.original.totalLoaded) || 0
      const payment_status = row.original.payment_status || 'confirmed'
      
      // Color logic: black for confirmed payments, yellow for pending payments
      let colorClass = 'text-black' // Default: black
      if (totalLoaded > 0 && payment_status !== 'confirmed') {
        colorClass = 'text-yellow-600' // Yellow: pending payments
      }
      
      return (
        <div className={`font-medium ${colorClass}`}>
          {formatCurrency(totalLoaded)}
        </div>
      )
    },
  },
  {
    accessorKey: 'totalSpent',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo Utilizado" />
    ),
    cell: ({ row }) => {
      const totalSpent = Number(row.original.totalSpent) || 0
      const totalLoaded = row.original.totalLoaded || 0
      const difference = totalLoaded - totalSpent
      
      return (
        <div className="flex items-center gap-2">
          <div className="font-medium text-red-600">
            {formatCurrency(totalSpent)}
          </div>
          {difference < 0 && (
            <IconAlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'totalLiquidated',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo Liquidado" />
    ),
    cell: ({ row }) => {
      const totalLiquidated = Number(row.original.totalLiquidated) || 0
      
      return (
        <div className="font-medium text-black">
          {formatCurrency(totalLiquidated)}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const staff = row.original
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
              onClick={() => staff.onEdit?.(staff as Staff)}
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
                    onClick={() => permissions.staff?.rechargeCard ? staff.onLoadCard?.(staff as Staff) : staff.onUpgradeClick?.()}
                    className='flex items-center'
                    disabled={!permissions.staff?.rechargeCard}
                  >
                    Carregar cartão
                    <DropdownMenuShortcut>
                      <IconCreditCard size={16} />
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!permissions.staff?.rechargeCard && (
                  <TooltipContent>
                    <p>Disponível apenas no plano Premium</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenuItem
              onClick={() => staff.onLiquidateSnackbar?.(staff as Staff)}
              className='flex items-center'
              disabled={!staff.snack_bar_balance || Number(staff.snack_bar_balance) <= 0}
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