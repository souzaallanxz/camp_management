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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateStaffSchema, type UpdateStaff } from '../data/schema'
import { toast } from 'sonner'
import { useCamps } from '@/features/camps/hooks/use-camps'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { staffService } from '../services/staff-service'
import { useQuery } from '@tanstack/react-query'
import React from 'react'

interface StaffDetailsProps {
  staffId: string | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function StaffDetails({ staffId, onOpenChange, onSuccess }: StaffDetailsProps) {
  const { data: camps, isLoading: isLoadingCamps } = useCamps()
  
  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', staffId],
    queryFn: () => staffService.findById(staffId!),
    enabled: !!staffId,
  })

  const form = useForm<UpdateStaff>({
    resolver: zodResolver(updateStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      camp_id: '',
    },
  })

  // Update form when staff data is loaded
  React.useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        camp_id: staff.camp_id,
      })
    }
  }, [staff, form])

  const onSubmit = async (data: UpdateStaff) => {
    if (!staffId) return

    try {
      const result = await staffService.update(staffId, data)

      if (!result) {
        throw new Error('Failed to update staff member')
      }

      toast.success('Membro do staff atualizado com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao atualizar membro do staff: ${errorMessage}`)
    }
  }

  const isOpen = !!staffId

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar membro do staff</DialogTitle>
          <DialogDescription>
            Atualize os dados do membro do staff abaixo.
          </DialogDescription>
        </DialogHeader>

        {isLoadingStaff ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        ) : (
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
              <Button type="submit">Atualizar membro do staff</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 