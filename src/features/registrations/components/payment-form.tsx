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
import { createPayment } from '../services/payment-service'

interface PaymentFormProps {
  registrationId: string
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ registrationId, onSuccess, onCancel }: PaymentFormProps) {
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
      
      // Não cria pagamento se o valor for 0
      if (numericAmount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'O valor do pagamento deve ser maior que 0',
        })
        return
      }

      await createPayment({
        registration_id: registrationId,
        amount: numericAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        payment_link: null,
        phone_number: paymentMethod === 'MB Way' ? phoneNumber : null
      })

      toast({
        title: 'Success',
        description: 'Payment created successfully',
      })
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payment'
      toast({
        variant: 'destructive',
        title: 'Error',
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
          {loading ? 'A criar...' : 'Criar Pagamento'}
        </Button>
      </div>
    </form>
  )
} 