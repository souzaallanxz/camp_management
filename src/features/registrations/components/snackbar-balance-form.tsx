import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { PaymentMethod } from '../data/schema'
import { supabase } from '@/lib/supabase'
import { MBWayService } from '../services/mbway-service'

interface SnackbarBalanceFormProps {
  registrationId: string
  onSuccess: () => void
  onCancel: () => void
}

export function SnackbarBalanceForm({ registrationId, onSuccess, onCancel }: SnackbarBalanceFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MB Way')
  const [phoneNumber, setPhoneNumber] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const numericAmount = Number(amount)
      
      if (numericAmount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'O valor do carregamento deve ser maior que 0',
        })
        return
      }

      // If payment method is MB Way, trigger the payment request first
      if (paymentMethod === 'MB Way') {
        try {
          const mbwayResponse = await MBWayService.requestPayment({
            mobileNumber: phoneNumber,
            amount: numericAmount,
            description: `Carregamento Cartão - ${registrationId}`,
            orderId: `${registrationId}-${Date.now()}`,
          })

          // If we get here, the MB Way request was successful
          toast({
            title: 'MB Way',
            description: 'Pedido MB Way enviado. Por favor, confirme o pagamento na sua app.',
          })
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Erro MB Way',
            description: error instanceof Error ? error.message : 'Erro ao processar pagamento MB Way',
          })
          setLoading(false)
          return
        }
      }

      // Only proceed with the balance creation if we get here
      const { error } = await supabase
        .from('snackbar_balance')
        .insert({
          registration_id: registrationId,
          amount: numericAmount,
          payment_method: paymentMethod,
          phone_number: paymentMethod === 'MB Way' ? phoneNumber : null,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Carregamento efetuado com sucesso',
      })
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao efetuar carregamento'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid gap-4 text-sm">
        <div className="grid grid-cols-4 items-center">
          <span className="font-medium">Método de Pagamento</span>
          <div className="col-span-3">
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MB Way">MB Way</SelectItem>
                <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {paymentMethod === 'MB Way' && (
          <div className="grid grid-cols-4 items-center">
            <span className="font-medium">Número de Telemóvel</span>
            <div className="col-span-3">
              <Input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Introduza o número de telemóvel"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 items-center">
          <span className="font-medium">Valor</span>
          <div className="col-span-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Introduza o valor"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'A processar...' : 'Carregar'}
        </Button>
      </div>
    </form>
  )
} 