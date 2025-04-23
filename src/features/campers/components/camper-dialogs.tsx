import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCamperDialogs } from '../context/camper-dialogs-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { insertCamperSchema, type InsertCamper } from '../data/schema'
import { db } from '@/lib/db'
import { toast } from 'sonner'

interface CamperDialogsProps {
  onCamperCreated?: () => void
}

export function CamperDialogs({ onCamperCreated }: CamperDialogsProps) {
  const { isCreateDialogOpen, closeCreateDialog } = useCamperDialogs()
  const form = useForm<InsertCamper>({
    resolver: zodResolver(insertCamperSchema),
    defaultValues: {
      form_id: '',
      name: '',
      email: '',
      contact: '',
      camp: '',
      additional_notes: '',
    },
  })

  const onSubmit = async (data: InsertCamper) => {
    try {
      const { error } = await db.query(
        `INSERT INTO campers (
          form_id,
          name,
          email,
          contact,
          camp,
          additional_notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.form_id || null,
          data.name,
          data.email,
          data.contact,
          data.camp || null,
          data.additional_notes || null,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )

      if (error) throw error

      toast.success('Campista criado com sucesso!')
      closeCreateDialog()
      form.reset()
      onCamperCreated?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao criar campista: ${errorMessage}`)
    }
  }

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo campista</DialogTitle>
          <DialogDescription>
            Preencha os dados do campista abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Nome do campista"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="Email do campista"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contato</Label>
            <Input
              id="contact"
              {...form.register('contact')}
              placeholder="Número de telefone"
            />
            {form.formState.errors.contact && (
              <p className="text-sm text-destructive">
                {form.formState.errors.contact.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="camp">Acampamento</Label>
            <Input
              id="camp"
              {...form.register('camp')}
              placeholder="Nome do acampamento"
            />
            {form.formState.errors.camp && (
              <p className="text-sm text-destructive">
                {form.formState.errors.camp.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_notes">Observações</Label>
            <Textarea
              id="additional_notes"
              {...form.register('additional_notes')}
              placeholder="Observações adicionais"
            />
            {form.formState.errors.additional_notes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.additional_notes.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit">Criar campista</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 