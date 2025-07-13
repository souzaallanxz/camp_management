import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { camperService } from '../services/camper-service'
import { formatCurrency } from '@/lib/utils'

interface LiquidateSnackbarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  camperId: string
  camperName: string
  currentBalance: number
  onSuccess?: () => void
}

export function LiquidateSnackbarDialog({
  open,
  onOpenChange,
  camperId,
  camperName,
  currentBalance,
  onSuccess
}: LiquidateSnackbarDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLiquidate = async () => {
    setIsLoading(true)
    
    try {
      const result = await camperService.liquidateSnackbarBalance(camperId)
      
      if (result.success) {
        toast.success(`Saldo liquidado com sucesso! Valor: ${formatCurrency(result.liquidated_amount || 0)}`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.message || 'Erro ao liquidar saldo do snackbar')
      }
    } catch {
      toast.error('Erro inesperado ao liquidar saldo do snackbar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liquidar Saldo do Snackbar</DialogTitle>
          <DialogDescription>
            Tem a certeza que deseja liquidar todo o saldo disponível do campista?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Campista</div>
            <div className="font-medium">{camperName}</div>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Saldo Atual</div>
            <div className={`text-2xl font-bold ${currentBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentBalance)}
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta ação irá liquidar todo o saldo disponível e não pode ser desfeita.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLiquidate}
            disabled={isLoading || currentBalance <= 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'A liquidar...' : 'Liquidar Saldo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 