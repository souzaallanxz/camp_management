import React, { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Registration } from '../data/schema'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { IconDots, IconEye, IconUserCheck, IconCreditCard, IconCopy, IconTrash } from '@tabler/icons-react'
import { RegistrationDetailsSheet } from './registration-details-dialog'
import { RegistrationOnboardDialog } from './registration-onboard-dialog'
import { RegistrationDeleteDialog } from './registration-delete-dialog'
import { SnackbarBalanceDialog } from './snackbar-balance-dialog'
import { paymentService } from '../services/payment-service'
import { useToast } from '@/components/ui/use-toast'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'

export interface RegistrationWithActions extends Registration {
  onRegistrationUpdated: () => void
  actions: React.ReactElement
  camp_name?: string
  total_paid?: number
}

export interface ActionsProps {
  registration: Registration
  onRegistrationUpdated: () => void
}

// Component for copy link button
function CopyLinkButton({ registrationId }: { registrationId: string }) {
  const { toast } = useToast()
  
  const copyPaymentLink = async () => {
    try {
      const link = await paymentService.getLatestPaymentLink(registrationId)
      if (link) {
        await navigator.clipboard.writeText(link)
        toast({
          title: 'Link copiado',
          description: 'Link de pagamento copiado para a área de transferência'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Sem link',
          description: 'Não existe link de pagamento para esta inscrição'
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao copiar link de pagamento'
      })
    }
  }
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={copyPaymentLink}
      title="Copiar link de pagamento"
    >
      <IconCopy className="h-4 w-4" />
    </Button>
  )
}

export function Actions({ registration, onRegistrationUpdated }: ActionsProps) {
  const [showOnboardDialog, setShowOnboardDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showSnackbarBalanceDialog, setShowSnackbarBalanceDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const permissions = useTeamPermissions()
  const canDelete = permissions.registrations.delete

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <IconDots className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
            <IconEye className="mr-2 h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
          {registration.onboarding_status !== 'Onboarded' && (
            <DropdownMenuItem onClick={() => setShowOnboardDialog(true)}>
              <IconUserCheck className="mr-2 h-4 w-4" />
              Onboard
            </DropdownMenuItem>
          )}
          {registration.onboarding_status === 'Onboarded' && (
            <DropdownMenuItem onClick={() => setShowSnackbarBalanceDialog(true)}>
              <IconCreditCard className="mr-2 h-4 w-4" />
              Carregar cartão
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <IconTrash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RegistrationDetailsSheet
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        registration={registration}
        onRegistrationUpdated={onRegistrationUpdated}
      />

      <RegistrationOnboardDialog
        open={showOnboardDialog}
        onOpenChange={setShowOnboardDialog}
        registration={registration}
        onSuccess={onRegistrationUpdated}
      />

      <SnackbarBalanceDialog
        open={showSnackbarBalanceDialog}
        onOpenChange={setShowSnackbarBalanceDialog}
        registrationId={registration.id}
        onSuccess={onRegistrationUpdated}
      />

      {canDelete && (
        <RegistrationDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          registration={registration}
          onRegistrationDeleted={onRegistrationUpdated}
        />
      )}
    </>
  )
}

export const columns: ColumnDef<RegistrationWithActions>[] = [
  {
    accessorKey: 'form_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Form ID" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.form_id || '-'}</div>
    }
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.name || '-'}</div>
    },
    enableGlobalFilter: true
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.email || '-'}</div>
    },
    enableGlobalFilter: true
  },
  {
    accessorKey: 'contact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contacto" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.contact || '-'}</div>
    }
  },
  {
    accessorKey: 'camp_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acampamento" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.camp_name || '-'}</div>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status
      const statusStyles = {
        paid: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
        partial: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
        unpaid: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
      }

      return (
        <Badge className={statusStyles[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    }
  },
  {
    accessorKey: 'onboarding_status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Onboarding" />
    ),
    cell: ({ row }) => {
      const status = row.original.onboarding_status
      const statusStyles = {
        Pendente: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
        Onboarded: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
      }

      return (
        <Badge className={statusStyles[status]}>
          {status}
        </Badge>
      )
    }
  },
  {
    accessorKey: 'total_paid',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor Pago" />
    ),
    cell: ({ row }) => {
      return <div>{formatCurrency(row.original.total_paid || 0)}</div>
    }
  },
  {
    id: 'payment_link',
    header: 'Link',
    cell: ({ row }) => {
      const registration = row.original
      return <CopyLinkButton registrationId={registration.id} />
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const registration = row.original
      return (
        <Actions
          registration={registration}
          onRegistrationUpdated={registration.onRegistrationUpdated}
        />
      )
    }
  }
] 