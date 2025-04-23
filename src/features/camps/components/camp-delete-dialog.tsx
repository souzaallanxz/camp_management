import { useQueryClient } from '@tanstack/react-query'
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
import { toast } from 'sonner'
import { useState } from 'react'
import { db } from '@/lib/db'

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
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!camp) return

    setIsDeleting(true)

    try {
      // First check if we can delete the camp
      const { data: registrations, error: registrationsError } = await db.query(
        'SELECT id FROM registrations WHERE camp_id = $1 LIMIT 1',
        [camp.id]
      )

      if (registrationsError) {
        throw new Error(`Error checking registrations: ${registrationsError.message}`)
      }

      if (registrations && registrations.length > 0) {
        toast.error('Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.')
        setIsDeleting(false)
        return
      }

      // Delete the camp
      const { error: deleteError } = await db.query(
        'DELETE FROM camps WHERE id = $1',
        [camp.id]
      )

      if (deleteError) {
        throw new Error(`Error deleting camp: ${deleteError.message}`)
      }

      toast.success('Acampamento excluído com sucesso')
      queryClient.invalidateQueries({ queryKey: ['camps'] })
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao excluir acampamento: ${errorMessage}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir acampamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o acampamento {camp?.name}? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 