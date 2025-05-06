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
        description: 'Registration deleted successfully.',
      })
      onRegistrationDeleted()
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete registration. Please try again.',
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the registration for {registration.name} and all
            associated payments. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className='bg-red-600 hover:bg-red-700'
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 