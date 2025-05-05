import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { type Camp, insertCampSchema, type InsertCamp } from '../data/schema'
import { campService } from '../services/camp-service'
import { toast } from 'sonner'
import { useEffect } from 'react'

interface CampDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  camp: Camp | null
}

export function CampDialog({ open, onOpenChange, camp }: CampDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<InsertCamp>({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      price: '',
    },
  })

  useEffect(() => {
    if (camp) {
      form.reset({
        name: camp.name,
        start_date: new Date(camp.start_date).toISOString().split('T')[0],
        end_date: new Date(camp.end_date).toISOString().split('T')[0],
        price: camp.price,
      })
    } else {
      form.reset({
        name: '',
        start_date: '',
        end_date: '',
        price: '',
      })
    }
  }, [camp, form])

  const { mutateAsync: createCamp, isPending: isCreating } = useMutation({
    mutationFn: campService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camps'] })
      onOpenChange(false)
      form.reset()
      toast.success('Acampamento criado com sucesso!')
    },
  })

  const { mutateAsync: updateCamp, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertCamp }) =>
      campService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camps'] })
      onOpenChange(false)
      form.reset()
      toast.success('Acampamento atualizado com sucesso!')
    },
  })

  const isPending = isCreating || isUpdating

  async function onSubmit(data: InsertCamp) {
    try {
      if (camp) {
        await updateCamp({ id: camp.id, data })
      } else {
        await createCamp(data)
      }
    } catch {
      toast.error('Erro ao salvar acampamento')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {camp ? 'Editar acampamento' : 'Novo acampamento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={typeof value === 'string' ? value : ''}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel>Data de Fim</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={typeof value === 'string' ? value : ''}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {camp ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 