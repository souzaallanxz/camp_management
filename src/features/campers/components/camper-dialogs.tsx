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
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { insertCamperSchema, type InsertCamper } from '../data/schema'
import { db } from '@/lib/db'
import { toast } from 'sonner'
import { useCamps } from '@/features/camps/hooks/use-camps'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CamperDialogsProps {
  onCamperCreated?: () => void
}

export function CamperDialogs({ onCamperCreated }: CamperDialogsProps) {
  const { isCreateDialogOpen, closeCreateDialog } = useCamperDialogs()
  const { data: camps, isLoading: isLoadingCamps } = useCamps()
  
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
            <Controller
              name="camp"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um acampamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCamps ? (
                      <SelectItem value="loading" disabled>
                        Carregando acampamentos...
                      </SelectItem>
                    ) : camps && camps.length > 0 ? (
                      camps.map((camp) => (
                        <SelectItem key={camp.id} value={camp.name}>
                          {camp.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum acampamento encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
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