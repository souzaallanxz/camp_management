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
import { updateOnboardingStatus } from '../services/registration-service'
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
import { createPayment } from '../services/payment-service'
import { formatCurrency } from '@/lib/utils'
import { camperService } from '@/features/campers/services/camper-service'
import { useQueryClient } from '@tanstack/react-query'

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
  const [paymentMethod, setPaymentMethod] = useState<'MB Way' | 'Transferência Bancária' | 'Dinheiro'>('MB Way')
  const [phoneNumber, setPhoneNumber] = useState('')
  const queryClient = useQueryClient()

  if (!registration) return null

  // Calcular o valor restante a pagar
  const campPrice = registration.camp?.price || 0
  const totalPaid = registration.total_amount_paid || 0
  const remainingAmount = Number(campPrice) - Number(totalPaid)

  const createCamper = async () => {
    // Criar o camper com os dados da registration
    await camperService.create({
      name: registration.name,
      email: registration.email,
      contact: registration.contact,
      registration_id: registration.id,
      camp: registration.camp?.name || '',
      form_id: registration.form_id,
      additional_notes: null
    })
  }

  const handleConfirm = async () => {
    try {
      setLoading(true)
      // Criar o camper
      await createCamper()
      // Atualizar o status de onboarding
      await updateOnboardingStatus(registration.id, 'Onboarded')
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
      // Criar o pagamento
      await createPayment({
        registration_id: registration.id,
        amount: remainingAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        payment_link: null,
        phone_number: paymentMethod === 'MB Way' ? phoneNumber : null
      })
      
      // Criar o camper
      await createCamper()

      // Atualizar o status de onboarding
      await updateOnboardingStatus(registration.id, 'Onboarded')
      
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
            <p className="text-sm text-muted-foreground">
              Valor total do campo: {formatCurrency(campPrice)}
              <br />
              Valor já pago: {formatCurrency(totalPaid)}
              <br />
              <strong>Valor em falta: {formatCurrency(remainingAmount)}</strong>
            </p>

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
            {loading ? 'A processar...' : isPaid ? 'Confirmar' : 'Pagar e Onboard'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}