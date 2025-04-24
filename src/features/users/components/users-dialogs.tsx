import { UsersActionDialog } from './users-action-dialog'
import { UsersDeleteDialog } from './users-delete-dialog'
import { UsersInviteDialog } from './users-invite-dialog'
import { useUsersDialogs } from '../context/users-context'

interface UsersDialogsProps {
  onUserUpdated: () => void
}

export function UsersDialogs({ onUserUpdated }: UsersDialogsProps) {
  const {
    isInviteDialogOpen,
    closeInviteDialog,
    isEditDialogOpen,
    closeEditDialog,
    isDeleteDialogOpen,
    closeDeleteDialog,
    selectedUser
  } = useUsersDialogs()

  return (
    <>
      <UsersInviteDialog
        open={isInviteDialogOpen}
        onOpenChange={closeInviteDialog}
        onUserAdded={onUserUpdated}
      />

      {selectedUser && isEditDialogOpen && (
        <UsersActionDialog
          open={isEditDialogOpen}
          onOpenChange={closeEditDialog}
          onUserUpdated={onUserUpdated}
          mode="edit"
          initialData={selectedUser}
        />
      )}

      {selectedUser && isDeleteDialogOpen && (
        <UsersDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={closeDeleteDialog}
          onUserDeleted={onUserUpdated}
          user={selectedUser}
        />
      )}
    </>
  )
}
