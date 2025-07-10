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

interface StaffSnackbarBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffId: string
  onSuccess?: () => void
}

export function StaffSnackbarBalanceDialog({ 
  open, 
  onOpenChange, 
  staffId, 
  onSuccess 
}: StaffSnackbarBalanceDialogProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Por favor, insira um valor válido')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/staff-snackbar-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staffId,
          amount: parseFloat(amount),
          payment_method: 'Dinheiro',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add balance')
      }

      toast.success('Saldo carregado com sucesso!')
      setAmount('')
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('Erro ao carregar saldo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carregar saldo</DialogTitle>
          <DialogDescription>
            Adicione saldo para o membro do staff.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Carregando...' : 'Carregar saldo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 