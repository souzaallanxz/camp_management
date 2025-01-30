import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { type Camp } from '../data/schema'
import { campService } from '../services/camp-service'
import { toast } from 'sonner'

interface CampDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  camp: Camp | null
}

export function CampDeleteDialog({
  open,
  onOpenChange,
  camp,
}: CampDeleteDialogProps) {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteCamp, isPending } = useMutation({
    mutationFn: campService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camps'] })
      onOpenChange(false)
      toast.success('Acampamento excluído com sucesso!')
    },
  })

  async function handleDelete() {
    if (!camp) return

    try {
      await deleteCamp(camp.id)
    } catch {
      toast.error('Erro ao excluir acampamento')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir acampamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o acampamento {camp?.name}? Esta ação
            não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 