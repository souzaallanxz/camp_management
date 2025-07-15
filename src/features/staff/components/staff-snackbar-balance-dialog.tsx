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
import { useState } from 'react'
import { toast } from 'sonner'
import { getTeamIdHeader } from '@/lib/auth'
import { buildApiUrl } from '@/services/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MBWayService } from '@/features/registrations/services/mbway-service'
import { type PaymentMethod } from '@/features/registrations/data/schema'

interface StaffSnackbarBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffId: string
  onSuccess?: () => void
}

// Função para salvar o saldo através da API
async function saveStaffSnackbarBalance(data: {
  staff_id: string
  amount: number
  payment_method: string
  phone_number?: string | null
  request_id?: string | null
}) {
  const response = await fetch(buildApiUrl('/api/staff-snackbar-balance'), {
    method: 'POST',
    headers: {
      ...getTeamIdHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to add balance');
  }
  
  return response.json();
}

export function StaffSnackbarBalanceDialog({ 
  open, 
  onOpenChange, 
  staffId, 
  onSuccess 
}: StaffSnackbarBalanceDialogProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MB Way')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const numericAmount = Number(amount)
      
      if (numericAmount <= 0) {
        toast.error('O valor do carregamento deve ser maior que 0')
        setIsLoading(false)
        return
      }

      // Gerar request_id se for MB Way
      // Formato: "S" + primeiros 5 dígitos do staff_id + dia + mes + hora + minuto (máx 15 dígitos)
      let requestId = null
      if (paymentMethod === 'MB Way' && staffId) {
        const staffIdStr = staffId.replace(/-/g, '') // Remove hífens
        const dd = String(new Date().getDate()).padStart(2, '0');
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const hh = String(new Date().getHours()).padStart(2, '0');
        const min = String(new Date().getMinutes()).padStart(2, '0');
        const suffix = `${dd}${mm}${hh}${min}`;
        const base = `S${staffIdStr.substring(0, 5)}`;
        requestId = (base + suffix).substring(0, 15);
        
        // Debug log
        toast.info(`Request ID gerado: ${requestId}`);
      }

      // Salvar através da API PRIMEIRO (para garantir que o request_id seja salvo)
      await saveStaffSnackbarBalance({
        staff_id: staffId,
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
            description: `Carregamento Cartão Staff - ${staffId}`,
            orderId: requestId,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          toast.error(`Erro MB Way: ${errorMessage}`)
          setIsLoading(false)
          return
        }
      }

      toast.success('Carregamento realizado com sucesso!')
      setAmount('')
      setPhoneNumber('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao realizar carregamento: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carregar Cartão</DialogTitle>
          <DialogDescription>
            Adicione saldo para o membro do staff.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
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
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
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
                <SelectItem value="Multibanco">Multibanco</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'MB Way' && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número de Telefone</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 