import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Registration } from '../data/schema'
import { registrationService } from '../services/registration-service'

interface RegistrationDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: Registration | null
  onRegistrationDeleted: () => void
}

export function RegistrationDeleteDialog({
  open,
  onOpenChange,
  registration,
  onRegistrationDeleted,
}: RegistrationDeleteDialogProps) {
  const { toast } = useToast()

  if (!registration) return null

  const handleDelete = async () => {
    try {
      await registrationService.deleteRegistration(registration.id)
      toast({
        description: 'Inscrição eliminada com sucesso.',
      })
      onRegistrationDeleted()
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível eliminar a inscrição. Tente novamente.',
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acção irá eliminar permanentemente a inscrição de {registration.name} e
            todos os pagamentos associados. Esta acção não pode ser revertida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className='bg-red-600 hover:bg-red-700'
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 