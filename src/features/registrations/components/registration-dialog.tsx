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
  }).optional(),
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
.refine(
  (data) => {
    // Se amount > 0, payment_method é obrigatório
    return data.amount <= 0 || !!data.payment_method;
  },
  {
    message: "Método de pagamento é obrigatório quando o valor é maior que 0",
    path: ["payment_method"],
  }
);

type CreateRegistrationFormData = z.infer<typeof createRegistrationSchema>

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistrationCreated?: () => void
}

export function RegistrationDialog({
  open,
  onOpenChange,
  onRegistrationCreated,
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
        // Ensure camp_id is a string before sending
        const camp_id = typeof data.camp_id === 'string' 
          ? data.camp_id
          : null;

        if (!camp_id) {
          throw new Error('Invalid camp_id format');
        }

        // Cria a inscrição com os dados do futuro camper
        const registration = await registrationService.create({
          camp_id,
          name: data.name,
          email: data.email,
          contact: data.contact,
          form_id: data.form_id,
        })

        // Cria o pagamento associado à inscrição apenas se o valor for maior que 0
        if (registration && data.amount > 0 && data.payment_method) {
          try {
            // Garantir que o método de pagamento seja um dos tipos válidos
            const paymentMethod = data.payment_method === 'MB Way' || 
                                 data.payment_method === 'Transferência Bancária' || 
                                 data.payment_method === 'Dinheiro' 
                                 ? data.payment_method 
                                 : 'Dinheiro'; // Valor padrão seguro
            
            const payment = await paymentService.createPayment({
              registration_id: registration.id,
              payment_method: paymentMethod,
              amount: data.amount,
              payment_date: new Date().toISOString(),
              phone_number: data.phone_number || null,
              payment_link: null,
            });

            // Se o método de pagamento for MB Way, faz o pedido de pagamento
            if (payment && paymentMethod === 'MB Way' && data.phone_number) {
              try {
                const mbwayResult = await MBWayService.requestPayment({
                  mobileNumber: data.phone_number,
                  amount: data.amount,
                  description: `Pagamento de inscrição - ${data.name}`,
                  orderId: data.form_id || String(payment.id || '0'),
                  email: data.email,
                })
                
                if (mbwayResult.Success) {
                  toast.success('Pedido de pagamento MB Way enviado! Por favor, verifique o seu telemóvel.')
                } else {
                  toast.error(`Erro MB Way: ${mbwayResult.Message}`)
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
                toast.error(`Erro ao enviar pedido de pagamento MB Way: ${errorMessage}`)
              }
            }
          } catch (paymentError) {
            const errorMessage = paymentError instanceof Error ? paymentError.message : 'Erro desconhecido';
            toast.error(`Erro ao criar pagamento: ${errorMessage}`);
            // Continue com o fluxo mesmo sem o pagamento
          }
        }

        return registration
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar inscrição'
        throw new Error(message)
      }
    },
    onSuccess: () => {
      // Invalidar a query para garantir que os dados sejam atualizados
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      
      // Resetar o formulário
      form.reset()
      
      // Fechar o diálogo
      onOpenChange(false);
      
      // Notificar o usuário do sucesso
      toast.success('Inscrição criada com sucesso!')
      
      // Chamar o callback para atualizar a tabela
      if (onRegistrationCreated) {
        onRegistrationCreated();
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erro ao criar inscrição'
      toast.error(message)
    },
  })

  const isPending = isCreating

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle>Nova inscrição</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(async (data) => {
              try {
                // Verificar se o valor é maior que zero e definir o método de pagamento adequadamente
                if (data.amount <= 0) {
                  // Se o valor for 0 ou negativo, não criar pagamento
                  data = {
                    ...data,
                    amount: 0,
                    payment_method: undefined as any // Tipo necessário para satisfazer o TypeScript
                  };
                }
                
                // Criar o registro - nota: não duplicar este código, deixar o mutateAsync lidar com isso
                await createRegistration(data);
                
                // Não precisamos fazer nada mais aqui, o evento onSuccess da mutação já lida com o fechamento e notificações
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Erro ao salvar inscrição';
                toast.error(message);
              }
            })}
            className="mt-6"
          >
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
                                form.setValue('amount', price || 0)
                                
                                // Se o valor for 0, limpar o método de pagamento
                                if (price <= 0) {
                                  form.setValue('payment_method', undefined)
                                  form.setValue('phone_number', '')
                                }
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