import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { registrationService } from '../services/registration-service'
import { toast } from 'sonner'
import { useCamps } from '@/features/camps/hooks/use-camps'
import { z } from 'zod'
import { formatCurrency } from '@/lib/utils'
import { type Camp } from '@/features/camps/data/schema'
import { Separator } from '@/components/ui/separator'
import { paymentService } from '../services/payment-service'
import { MBWayService } from '../services/mbway-service'

const createRegistrationSchema = z.object({
  // Registration fields
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  contact: z.string().min(1, 'Contacto é obrigatório'),
  camp_id: z.string().uuid('Selecione um acampamento'),
  form_id: z.string().optional().nullable(),
  
  // Payment fields
  payment_method: z.enum(['MB Way', 'Transferência Bancária', 'Dinheiro'], {
    required_error: 'Selecione um método de pagamento',
  }),
  amount: z.coerce.number().min(0, 'Valor deve ser maior que 0'),
  phone_number: z.string()
    .nullable()
    .optional()
    .refine((val) => {
      if (!val) return true
      // Remove any non-digit characters
      const digits = val.replace(/\D/g, '')
      // Check if it's a valid Portuguese phone number (9 digits, starting with 9)
      return /^9\d{8}$/.test(digits)
    }, 'Número de telefone inválido. Deve começar com 9 e ter 9 dígitos'),
})

type CreateRegistrationFormData = z.infer<typeof createRegistrationSchema>

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrationDialog({
  open,
  onOpenChange,
}: RegistrationDialogProps) {
  const queryClient = useQueryClient()
  const { data: camps = [] } = useCamps()

  const form = useForm<CreateRegistrationFormData>({
    resolver: zodResolver(createRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      contact: '',
      camp_id: '',
      form_id: '',
      payment_method: undefined,
      amount: 0,
      phone_number: '',
    },
  })

  const { mutateAsync: createRegistration, isPending: isCreating } = useMutation({
    mutationFn: async (data: CreateRegistrationFormData) => {
      try {
        // Cria a inscrição com os dados do futuro camper
        const registration = await registrationService.create({
          camp_id: data.camp_id,
          name: data.name,
          email: data.email,
          contact: data.contact,
          form_id: data.form_id,
        })

        // Cria o pagamento associado à inscrição apenas se o valor for maior que 0
        if (registration && data.amount > 0) {
          const payment = await paymentService.createPayment({
            registration_id: registration.id,
            payment_method: data.payment_method,
            amount: data.amount,
            payment_date: new Date().toISOString(),
            phone_number: data.phone_number || null,
            payment_link: null,
          })

          // Se o método de pagamento for MB Way, faz o pedido de pagamento
          if (data.payment_method === 'MB Way' && data.phone_number) {
            console.log('Iniciando pagamento MB Way:', {
              method: data.payment_method,
              phone: data.phone_number,
              amount: data.amount,
              form_id: data.form_id,
            })

            try {
              const mbwayResult = await MBWayService.requestPayment({
                mobileNumber: data.phone_number,
                amount: data.amount,
                description: `Pagamento de inscrição - ${data.name}`,
                orderId: data.form_id || String(payment.id),
                email: data.email,
              })

              console.log('Resposta MB Way:', mbwayResult)
              
              if (mbwayResult.Success) {
                toast.success('Pedido de pagamento MB Way enviado! Por favor, verifique o seu telemóvel.')
              } else {
                toast.error(`Erro MB Way: ${mbwayResult.Message}`)
              }
            } catch (error) {
              console.error('Erro ao processar MB Way:', error)
              const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
              toast.error(`Erro ao enviar pedido de pagamento MB Way: ${errorMessage}`)
            }
          } else if (data.payment_method === 'MB Way') {
            console.log('MB Way selecionado mas faltando número de telefone:', {
              method: data.payment_method,
              phone: data.phone_number,
            })
          }
        }

        return registration
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar inscrição'
        throw new Error(message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      onOpenChange(false)
      form.reset()
      toast.success('Inscrição criada com sucesso!')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erro ao criar inscrição'
      toast.error(message)
    },
  })

  const isPending = isCreating

  async function onSubmit(data: CreateRegistrationFormData) {
    try {
      await createRegistration(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar inscrição'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle>Nova inscrição</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
            {/* Registration Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Dados da Inscrição</h3>
                <Separator className="mb-6" />
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
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
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="camp_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Acampamento</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value)
                              // Atualiza o valor do pagamento com o preço do acampamento
                              const camp = camps.find((c: Camp) => c.id === value)
                              if (camp) {
                                const price = typeof camp.price === 'string' ? parseFloat(camp.price) : camp.price
                                form.setValue('amount', price)
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um acampamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {camps.map((camp: Camp) => (
                                <SelectItem key={camp.id} value={camp.id}>
                                  {camp.name} - {formatCurrency(camp.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="form_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Form ID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-6 mt-8">
              <div>
                <h3 className="text-sm font-medium mb-4">Dados do Pagamento</h3>
                <Separator className="mb-6" />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Método de Pagamento</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o método de pagamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MB Way">MB Way</SelectItem>
                              <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Valor</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-1.5">
                        <FormLabel>Telefone (MB Way)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Criar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 