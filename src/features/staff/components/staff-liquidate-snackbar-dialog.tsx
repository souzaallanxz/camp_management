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
import { useState } from 'react'
import { toast } from 'sonner'
import { staffService } from '../services/staff-service'
import { formatCurrency } from '@/lib/utils'

interface StaffLiquidateSnackbarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffId: string
  staffName: string
  currentBalance: number
  onSuccess?: () => void
}

export function StaffLiquidateSnackbarDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  currentBalance,
  onSuccess
}: StaffLiquidateSnackbarDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLiquidate = async () => {
    setIsLoading(true)
    
    try {
      const result = await staffService.liquidateSnackbarBalance(staffId)
      
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            Liquidar Saldo do Snackbar
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Tem a certeza que deseja liquidar todo o saldo disponível do membro do staff?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-3 space-y-3">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Membro do Staff</span>
              <span className="text-sm font-medium">{staffName}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Saldo Atual</span>
              <span className={`text-sm font-semibold ${currentBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>
          
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta ação irá liquidar todo o saldo disponível e não pode ser desfeita.
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLiquidate}
            disabled={isLoading || currentBalance <= 0}
            className="h-9 bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'A liquidar...' : 'Liquidar Saldo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 