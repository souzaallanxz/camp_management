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
import { supabase } from '@/lib/supabase'
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
      const { error } = await supabase.from('campers').insert(data)
      if (error) throw error

      toast.success('Campista criado com sucesso!')
      closeCreateDialog()
      form.reset()
      onCamperCreated?.()
    } catch (error) {
      console.error('Error creating camper:', error)
      toast.error('Erro ao criar campista')
    }
  }

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Novo Campista</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo campista abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='form_id'>Form ID</Label>
              <Input
                id='form_id'
                {...form.register('form_id')}
                className='col-span-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='name'>Nome</Label>
              <Input
                id='name'
                {...form.register('name')}
                className='col-span-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                {...form.register('email')}
                className='col-span-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='contact'>Contacto</Label>
              <Input
                id='contact'
                {...form.register('contact')}
                className='col-span-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='camp'>Acampamento</Label>
              <Input
                id='camp'
                {...form.register('camp')}
                className='col-span-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='additional_notes'>Notas Adicionais</Label>
              <Textarea
                id='additional_notes'
                {...form.register('additional_notes')}
                className='col-span-3'
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              type='button'
              onClick={closeCreateDialog}
            >
              Cancelar
            </Button>
            <Button type='submit'>Criar Campista</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 