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
import { supabase } from '@/lib/supabase'

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

    // First check if we can delete the camp
    const { data: registrations, error: registrationsError } = await supabase
      .from('registrations')
      .select('id')
      .eq('camp_id', camp.id)
      .limit(1)

    if (registrationsError) {
      toast.error('Erro ao verificar inscrições')
      setIsDeleting(false)
      return
    }

    if (registrations && registrations.length > 0) {
      toast.error('Não é possível excluir um acampamento que possui inscrições. Por favor, exclua todas as inscrições primeiro.')
      setIsDeleting(false)
      return
    }

    // If we get here, we can try to delete the camp
    try {
      const { error: deleteError } = await supabase
        .from('camps')
        .delete()
        .eq('id', camp.id)

      if (deleteError) throw deleteError

      queryClient.invalidateQueries({ queryKey: ['camps'] })
      onOpenChange(false)
      toast.success('Acampamento excluído com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir acampamento')
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
            Tem certeza que deseja excluir o acampamento {camp?.name}? Esta ação
            não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 