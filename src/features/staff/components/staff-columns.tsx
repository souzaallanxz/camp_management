import { type ColumnDef } from '@tanstack/react-table'
import { type Staff } from '../data/schema'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
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
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface StaffWithActions extends Staff {
  onEdit?: (staff: Staff) => void
  onLoadCard?: (staff: Staff) => void
  onUpgradeClick?: () => void
  total_balance: number
  payment_status?: string
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
    accessorKey: 'total_balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo" />
    ),
    cell: ({ row }) => {
      const balance = Number(row.original.total_balance) || 0
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
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
] 