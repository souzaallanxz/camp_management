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

export interface CamperWithActions extends Camper {
  onEdit?: (camper: Camper) => void
  onLoadCard?: (camper: Camper) => void
  onUpgradeClick?: () => void
  total_balance: number
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
    cell: ({ row }) => row.getValue('camp') || '-'
  },
  {
    accessorKey: 'total_balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saldo" />
    ),
    cell: ({ row }) => {
      const balance = row.getValue('total_balance') as number
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
              onClick={() => camper.onEdit?.(camper)}
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
                    onClick={() => permissions.campers.rechargeCard ? camper.onLoadCard?.(camper) : camper.onUpgradeClick?.()}
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