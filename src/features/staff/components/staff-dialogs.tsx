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
import { useStaffDialogs } from '../context/staff-dialogs-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { insertStaffSchema, type InsertStaff } from '../data/schema'
import { toast } from 'sonner'
import { useCamps } from '@/features/camps/hooks/use-camps'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { staffService, type CreateStaffData } from '../services/staff-service'

interface StaffDialogsProps {
  onStaffCreated?: () => void
}

export function StaffDialogs({ onStaffCreated }: StaffDialogsProps) {
  const { isCreateDialogOpen, closeCreateDialog } = useStaffDialogs()
  const { data: camps, isLoading: isLoadingCamps } = useCamps()
  
  const form = useForm<InsertStaff>({
    resolver: zodResolver(insertStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      camp_id: '',
    },
  })

  const onSubmit = async (data: InsertStaff) => {
    try {
      // Convert form data to staff service format
      const staffData: CreateStaffData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        camp_id: data.camp_id,
      }

      const result = await staffService.create(staffData)

      if (!result) {
        throw new Error('Failed to create staff member')
      }

      toast.success('Membro do staff criado com sucesso!')
      closeCreateDialog()
      form.reset()
      onStaffCreated?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao criar membro do staff: ${errorMessage}`)
    }
  }

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo membro do staff</DialogTitle>
          <DialogDescription>
            Preencha os dados do membro do staff abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Nome do membro do staff"
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
              placeholder="Email do membro do staff"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              {...form.register('phone')}
              placeholder="Número de telefone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="camp_id">Acampamento</Label>
            <Select
              onValueChange={(value) => form.setValue('camp_id', value)}
              value={form.watch('camp_id')}
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
                    <SelectItem key={camp.id} value={camp.id}>
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
            {form.formState.errors.camp_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.camp_id.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit">Criar membro do staff</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 