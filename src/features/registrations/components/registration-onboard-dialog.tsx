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
import { Registration } from '../data/schema'
import { registrationService } from '../services/registration-service'
import { toast } from 'sonner'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { paymentService } from '../services/payment-service'
import { formatCurrency } from '@/lib/utils'
import { camperService, type CreateCamperData } from '@/features/campers/services/camper-service'
import { useQueryClient } from '@tanstack/react-query'
import { MBWayService } from '../services/mbway-service'

interface RegistrationOnboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: Registration | null
  onSuccess: () => void
}

export function RegistrationOnboardDialog({
  open,
  onOpenChange,
  registration,
  onSuccess,
}: RegistrationOnboardDialogProps) {
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'MB Way' | 'Transferência Bancária' | 'Dinheiro' | 'Multibanco'>('MB Way')
  const [phoneNumber, setPhoneNumber] = useState('')
  const queryClient = useQueryClient()

  if (!registration) return null

  // Calcular o valor restante a pagar
  const campPrice = registration.camp?.price || 0
  const totalPaid = registration.total_paid || 0
  const remainingAmount = Number(campPrice) - Number(totalPaid)

  const createCamper = async () => {
    // Criar o camper com os dados da registration
    const camperData: CreateCamperData = {
      name: registration.name,
      email: registration.email,
      contact: registration.contact || null,
      registration_id: registration.id,
      camp: registration.camp?.name || 'Campo',
      form_id: registration.form_id || null,
      additional_notes: null
    };
    
    const newCamper = await camperService.create(camperData);
    return newCamper;
  }

  const handleConfirm = async () => {
    try {
      setLoading(true)
      
      // Criar o camper
      await createCamper()
      
      // Atualizar o status de onboarding
      await registrationService.updateOnboardingStatus(registration.id, 'Onboarded')
      
      // Invalidar a query de registrations para atualizar a tabela após todas as operações
      await queryClient.invalidateQueries({ queryKey: ['registrations'] })
      
      toast.success('Inscrição onboarded com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status de onboarding'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (paymentMethod === 'MB Way' && !phoneNumber) {
      toast.error('Por favor, insira um número de telemóvel para pagamento MB Way')
      return
    }

    try {
      setLoading(true)

      // Gerar request_id se for MB Way
      // Formato: "R" + form_id + dia + mes + hora + minuto (máx 15 dígitos)
      let requestId = null
      if (paymentMethod === 'MB Way' && registration.form_id) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const suffix = `${dd}${mm}${hh}${min}`;
        const base = `R${registration.form_id}`;
        requestId = (base + suffix).substring(0, 15);
        
        // Debug log
        toast.success(`Request ID gerado: ${requestId}`);
      }

      // Criar o pagamento PRIMEIRO (para garantir que o request_id seja salvo)
      await paymentService.createPayment({
        registration_id: registration.id,
        amount: remainingAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        payment_link: null,
        phone_number: paymentMethod === 'MB Way' ? phoneNumber : null,
        request_id: requestId
      })

      // If payment method is MB Way, trigger the payment request AFTER saving
      if (paymentMethod === 'MB Way') {
        try {
          await MBWayService.requestPayment({
            mobileNumber: phoneNumber,
            amount: remainingAmount,
            description: `Pagamento de inscrição - ${registration.name}`,
            orderId: requestId,
            email: registration.email
          })

          toast.success('Pedido MB Way enviado. Por favor, confirme o pagamento na sua app.')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro ao processar pagamento MB Way'
          toast.error(message)
          setLoading(false)
          return
        }
      }
      
      // Criar o camper
      await createCamper()

      // Atualizar o status de onboarding
      await registrationService.updateOnboardingStatus(registration.id, 'Onboarded')
      
      // Invalidar a query de registrations para atualizar a tabela após todas as operações
      await queryClient.invalidateQueries({ queryKey: ['registrations'] })
      
      toast.success('Pagamento criado e inscrição onboarded com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar pagamento'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const isPaid = registration.status === 'paid'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            {isPaid ? 'Confirmar Onboarding' : 'Pagamento Necessário'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {isPaid
              ? 'Deseja confirmar o onboarding desta inscrição?'
              : 'Para completar o onboarding, é necessário efetuar o pagamento do valor em falta.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isPaid && (
          <div className="py-3 space-y-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor total do campo</span>
                <span className="text-sm font-medium">{formatCurrency(campPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor já pago</span>
                <span className="text-sm font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-semibold">Valor em falta</span>
                <span className="text-sm font-semibold text-primary">{formatCurrency(remainingAmount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="payment-method" className="text-sm font-medium">
                  Método de Pagamento
                </label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
                >
                  <SelectTrigger id="payment-method" className="h-9">
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MB Way">MB Way</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Multibanco">Multibanco</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'MB Way' && (
                <div className="space-y-1">
                  <label htmlFor="phone-number" className="text-sm font-medium">
                    Número de Telemóvel
                  </label>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="amount" className="text-sm font-medium">
                  Valor a Pagar
                </label>
                <Input
                  id="amount"
                  type="text"
                  value={formatCurrency(remainingAmount)}
                  disabled
                  className="h-9 bg-muted"
                />
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={isPaid ? handleConfirm : handlePaymentSubmit}
            disabled={loading}
            className="h-9"
          >
            {loading ? 'Processando...' : isPaid ? 'Confirmar' : 'Efetuar Pagamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}