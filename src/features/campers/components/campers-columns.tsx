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
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface CamperWithActions extends Omit<Camper, 'camp'> {
  onEdit?: (camper: Camper) => void
  onLoadCard?: (camper: Camper) => void
  onUpgradeClick?: () => void
  snack_bar_balance?: string | number
  total_balance: number
  camp?: string | { name?: string }
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
    accessorKey: 'camp',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acampamento" />
    ),
    cell: ({ row }) => {
      const camp = row.original.camp;
      // Verificar se camp é objeto e tem propriedade name, ou é string
      if (typeof camp === 'object' && camp?.name) {
        return camp.name;
      }
      return camp || '-';
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const camp = row.getValue(id);
      let campName = '';
      if (camp !== undefined && camp !== null && typeof camp === 'object' && 'name' in camp && typeof (camp as { name?: string }).name === 'string') {
        campName = String((camp as { name: string }).name).trim();
      } else if (typeof camp === 'string') {
        campName = camp.trim();
      }
      return value.includes(campName);
    }
  },
  {
    accessorKey: 'snack_bar_balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo" />
    ),
    cell: ({ row }) => {
      const balance = Number(row.original.snack_bar_balance) || 0
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
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
] 