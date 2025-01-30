import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Registration } from '../data/schema'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { IconDots, IconEye, IconUserCheck, IconCreditCard } from '@tabler/icons-react'
import { RegistrationDetailsSheet } from './registration-details-dialog'
import { RegistrationOnboardDialog } from './registration-onboard-dialog'
import { SnackbarBalanceDialog } from './snackbar-balance-dialog'

interface RegistrationWithActions extends Registration {
  onRegistrationUpdated: () => void
}

interface ActionsProps {
  registration: Registration
  onRegistrationUpdated: () => void
}

function Actions({ registration, onRegistrationUpdated }: ActionsProps) {
  const [showOnboardDialog, setShowOnboardDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showSnackbarBalanceDialog, setShowSnackbarBalanceDialog] = useState(false)

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
      const camperName = row.original.camper?.name
      const registrationName = row.original.name
      return <div>{camperName || registrationName}</div>
    }
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const camperEmail = row.original.camper?.email
      const registrationEmail = row.original.email
      return <div>{camperEmail || registrationEmail}</div>
    }
  },
  {
    accessorKey: 'contact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contacto" />
    ),
    cell: ({ row }) => {
      const camperContact = row.original.camper?.contact
      const registrationContact = row.original.contact
      return <div>{camperContact || registrationContact}</div>
    }
  },
  {
    accessorKey: 'camp',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acampamento" />
    ),
    cell: ({ row }) => {
      return <div>{row.original.camp?.name}</div>
    }
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
    accessorKey: 'total_amount_paid',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor Pago" />
    ),
    cell: ({ row }) => {
      return <div>{formatCurrency(row.original.total_amount_paid || 0)}</div>
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