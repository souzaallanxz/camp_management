import { RegistrationDialog } from './registration-dialog'
import { RegistrationDetailsDialog } from './registration-details-dialog'
import { RegistrationDeleteDialog } from './registration-delete-dialog'
import { useRegistrationDialogs } from '../context/registration-dialogs-context'

interface RegistrationDialogsProps {
  onRegistrationCreated: () => void
  onRegistrationDeleted: () => void
}

export function RegistrationDialogs({
  onRegistrationCreated,
  onRegistrationDeleted,
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
        onRegistrationCreated={onRegistrationCreated}
      />

      <RegistrationDetailsDialog
        open={openDialog === 'view'}
        onOpenChange={handleOpenChange}
        registration={selectedRegistration}
      />

      <RegistrationDeleteDialog
        open={openDialog === 'delete'}
        onOpenChange={handleOpenChange}
        registration={selectedRegistration}
        onRegistrationDeleted={onRegistrationDeleted}
      />
    </>
  )
} 