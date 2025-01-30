import { RegistrationDialog } from './registration-dialog'
import { RegistrationDetailsSheet } from './registration-details-dialog'
import { RegistrationDeleteDialog } from './registration-delete-dialog'
import { RegistrationOnboardDialog } from './registration-onboard-dialog'
import { useRegistrationDialogs } from '../context/registration-dialogs-context'

interface RegistrationDialogsProps {
  onRegistrationDeleted: () => void
  onRegistrationUpdated: () => void
}

export function RegistrationDialogs({
  onRegistrationDeleted,
  onRegistrationUpdated,
}: RegistrationDialogsProps) {
  const {
    openDialog,
    selectedRegistration,
    handleOpenChange,
  } = useRegistrationDialogs()

  return (
    <>
      <RegistrationDialog
        open={openDialog === 'create'}
        onOpenChange={handleOpenChange}
      />

      <RegistrationDetailsSheet
        open={openDialog === 'view'}
        onOpenChange={handleOpenChange}
        registration={selectedRegistration}
        onRegistrationUpdated={onRegistrationUpdated}
      />

      <RegistrationDeleteDialog
        open={openDialog === 'delete'}
        onOpenChange={handleOpenChange}
        registration={selectedRegistration}
        onRegistrationDeleted={onRegistrationDeleted}
      />

      <RegistrationOnboardDialog
        open={openDialog === 'onboard'}
        onOpenChange={handleOpenChange}
        registration={selectedRegistration}
        onSuccess={onRegistrationUpdated}
      />
    </>
  )
} 