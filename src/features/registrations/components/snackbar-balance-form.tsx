import { useState, useEffect } from 'react'
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
import { api } from '@/lib/api-client'
import { registrationService } from '../services/registration-service'
import { useMBWayIntegration } from '../hooks/use-mbway-integration'

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
  request_id?: string | null
}) {
  const response = await api.post('/snackbar-balance', data);
  return response.data;
}

export function SnackbarBalanceForm({ registrationId, onSuccess, onCancel }: SnackbarBalanceFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transferência Bancária')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [registration, setRegistration] = useState<{ form_id?: string } | null>(null)
  const { isActive: mbwayActive, loading: mbwayLoading } = useMBWayIntegration()

  useEffect(() => {
    async function loadRegistration() {
      try {
        const data = await registrationService.getRegistrationById(registrationId)
        setRegistration(data)
      } catch {
        // Registration load failed, but we can continue
      }
    }

    loadRegistration()
  }, [registrationId])

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

      // Gerar request_id se for MB Way
      // Formato: "S" + form_id + dia + mes + hora + minuto (máx 15 dígitos)
      let requestId = null
      if (paymentMethod === 'MB Way' && registration?.form_id) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const suffix = `${dd}${mm}${hh}${min}`;
        const base = `S${registration.form_id}`;
        requestId = (base + suffix).substring(0, 15);
        
        // Debug log
        toast({
          title: 'Debug',
          description: `Request ID gerado: ${requestId} (form_id: ${registration.form_id})`,
        });
      } else if (paymentMethod === 'MB Way' && !registration?.form_id) {
        toast({
          title: 'Erro',
          description: 'Não foi possível obter o form_id da inscrição',
        });
        setLoading(false);
        return;
      }

      // Salvar através da API PRIMEIRO (para garantir que o request_id seja salvo)
      await saveSnackbarBalance({
        registration_id: registrationId,
        amount: numericAmount,
        payment_method: paymentMethod,
        phone_number: phoneNumber || null,
        request_id: requestId
      })

      // If payment method is MB Way, trigger the payment request AFTER saving
      if (paymentMethod === 'MB Way') {
        try {
          await MBWayService.requestPayment({
            mobileNumber: phoneNumber,
            amount: numericAmount,
            description: `Carregamento Cartão - ${registrationId}`,
            orderId: requestId || '',
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
          disabled={mbwayLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um método de pagamento" />
          </SelectTrigger>
          <SelectContent>
            {mbwayActive && (
              <SelectItem value="MB Way">MB Way</SelectItem>
            )}
            <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
            <SelectItem value="Multibanco">Multibanco</SelectItem>
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