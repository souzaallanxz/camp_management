import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SnackbarBalanceForm } from './snackbar-balance-form'

interface SnackbarBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationId: string
  onSuccess?: () => void
}

export function SnackbarBalanceDialog({
  open,
  onOpenChange,
  registrationId,
  onSuccess,
}: SnackbarBalanceDialogProps) {
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
          registrationId={registrationId}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
} 