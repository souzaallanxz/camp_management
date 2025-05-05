import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SnackbarBalanceForm } from '@/features/registrations/components/snackbar-balance-form'

interface CamperSnackbarBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  camperId: string
  onSuccess?: () => void
}

export function CamperSnackbarBalanceDialog({
  open,
  onOpenChange,
  camperId, // Na verdade já é o registrationId
  onSuccess,
}: CamperSnackbarBalanceDialogProps) {
  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carregar Cartão</DialogTitle>
        </DialogHeader>

        <SnackbarBalanceForm
          registrationId={camperId}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
} 