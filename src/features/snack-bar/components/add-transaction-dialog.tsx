import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { snackBarService } from '../services/snack-bar-service'
import { MBWayService } from '@/features/registrations/services/mbway-service'
import { useMBWayIntegration } from '@/features/registrations/hooks/use-mbway-integration'

const independentTransactionSchema = z.object({
  amount: z.string()
    .min(1, 'O valor é obrigatório')
    .refine((val) => !isNaN(Number(val)), 'Valor inválido')
    .refine((val) => Number(val) >= 0.01, 'O valor deve ser maior que zero'),
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro', 'Multibanco']),
  phone_number: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => {
  if (data.payment_method === 'MB Way') {
    return data.phone_number && data.phone_number.trim().length > 0
  }
  return true
}, {
  message: 'Número de telefone é obrigatório para pagamentos MB Way',
  path: ['phone_number']
})

type IndependentTransaction = z.infer<typeof independentTransactionSchema>

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const { isActive: mbwayActive, loading: mbwayLoading } = useMBWayIntegration()

  const form = useForm<IndependentTransaction>({
    resolver: zodResolver(independentTransactionSchema),
    defaultValues: {
      amount: '',
      payment_method: 'Transferência Bancária',
      phone_number: '',
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: IndependentTransaction) => {
      // Gerar request_id no formato SV + ano+mês+dia+hora+minuto (máximo 15 dígitos)
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2) // Últimos 2 dígitos do ano
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      const requestId = `SV${year}${month}${day}${hour}${minute}`.slice(0, 15)

      const payload = {
        amount: Number(data.amount),
        payment_method: data.payment_method,
        phone_number: data.phone_number || null,
        description: data.description || null,
        request_id: requestId,
      }

      // Primeiro salvar o pagamento na base de dados
      const result = await snackBarService.createIndependentPayment(payload)

      // Se o método de pagamento for MB Way, fazer a chamada da API
      if (data.payment_method === 'MB Way' && data.phone_number) {
        try {
          await MBWayService.requestPayment({
            mobileNumber: data.phone_number,
            amount: Number(data.amount),
            description: data.description || 'Pagamento Independente',
            orderId: requestId,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          toast.error(`Erro MB Way: ${errorMessage}`)
          // Não interromper o fluxo, apenas mostrar o erro
        }
      }

      return result
    },
    onSuccess: () => {
      toast.success('Pagamento criado com sucesso!')
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['all-transactions'],
      })

      // Reset form and close dialog
      form.reset()
      setLoading(false)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao criar pagamento',
      )
      setLoading(false)
    },
  })

  const onSubmit = async (data: IndependentTransaction) => {
    setLoading(true)
    mutation.mutate(data)
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Pagamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value
                        if (
                          value === '' ||
                          /^\d*\.?\d{0,2}$/.test(value)
                        ) {
                          field.onChange(value)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={mbwayLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um método de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mbwayActive && (
                        <SelectItem value="MB Way">MB Way</SelectItem>
                      )}
                      <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Multibanco">Multibanco</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('payment_method') === 'MB Way' && (
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Telefone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="9XXXXXXXX"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Descrição do pagamento (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 