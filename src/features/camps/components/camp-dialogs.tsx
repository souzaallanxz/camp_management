import { CampDialog } from './camp-dialog'
import { CampDeleteDialog } from './camp-delete-dialog'
import { useCampDialogs } from '../context/camp-dialogs-context'

export function CampDialogs() {
  const {
    isEditOpen,
    isDeleteOpen,
    selectedCamp,
    onCloseEdit,
    onCloseDelete,
  } = useCampDialogs()

  return (
    <>
      <CampDialog
        open={isEditOpen}
        onOpenChange={onCloseEdit}
        camp={selectedCamp}
      />

      <CampDeleteDialog
        open={isDeleteOpen}
        onOpenChange={onCloseDelete}
        camp={selectedCamp}
      />
    </>
  )
} 