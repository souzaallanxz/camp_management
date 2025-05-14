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
import { MBWayService } from '../services/mbway-service'

interface SnackbarBalanceFormProps {
  registrationId: string
  onSuccess: () => void
  onCancel: () => void
}

// Função para salvar o saldo através da API
async function saveSnackbarBalance(data: {
  registration_id: string
  amount: number
  payment_method: string
  phone_number?: string | null
}) {
  const teamId = localStorage.getItem('teamId');
  if (!teamId) throw new Error('No team ID found');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/snackbar-balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-team-id': teamId
    },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Erro ao salvar carregamento do cartão');
  }
  
  return response.json();
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
        setLoading(false)
        return
      }

      // If payment method is MB Way, trigger the payment request first
      if (paymentMethod === 'MB Way') {
        try {
          await MBWayService.requestPayment({
            mobileNumber: phoneNumber,
            amount: numericAmount,
            description: `Carregamento Cartão - ${registrationId}`,
            orderId: `${registrationId}-${Date.now()}`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          toast({
            variant: 'destructive',
            title: 'Erro MB Way',
            description: errorMessage,
          })
          setLoading(false)
          return
        }
      }

      // Salvar através da API em vez de db.query
      await saveSnackbarBalance({
        registration_id: registrationId,
        amount: numericAmount,
        payment_method: paymentMethod,
        phone_number: phoneNumber || null,
      })

      toast({
        title: 'Sucesso',
        description: 'Carregamento realizado com sucesso!',
      })
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Erro ao realizar carregamento: ${errorMessage}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Valor
        </label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="paymentMethod" className="text-sm font-medium">
          Método de Pagamento
        </label>
        <Select
          value={paymentMethod}
          onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um método de pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MB Way">MB Way</SelectItem>
            <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentMethod === 'MB Way' && (
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium">
            Número de Telefone
          </label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="9XXXXXXXX"
            required
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Processando...' : 'Confirmar'}
        </Button>
      </div>
    </form>
  )
} 