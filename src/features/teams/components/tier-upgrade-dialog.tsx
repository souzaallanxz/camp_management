import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { teamService } from '../services/team-service'
import { useCurrentTeam } from '../hooks/use-current-team'
import { Check, AlertTriangle, Star } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TierUpgradeDialog({ open, onOpenChange }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const { data: team, mutate } = useCurrentTeam()
  const isPremium = team?.tier === 'premium'

  const handleTierChange = async () => {
    if (!team) {
      toast('No team found', {
        description: 'Please try again.',
      })
      return
    }

    try {
      setIsLoading(true)
      
      const promise = teamService.updateTeam(team.id, {
        tier: isPremium ? 'free' : 'premium'
      })

      await toast.promise(promise, {
        loading: isPremium ? 'A fazer downgrade...' : 'A fazer upgrade...',
        success: () => {
          mutate()
          onOpenChange(false)
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          return isPremium 
            ? 'Plano alterado para Free com sucesso!' 
            : 'Plano alterado para Premium com sucesso!'
        },
        error: (err) => {
          return err instanceof Error 
            ? err.message 
            : 'Erro ao atualizar o plano. Por favor tente novamente.'
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {isPremium ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Star className="h-5 w-5 text-primary animate-pulse" />
              )}
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {isPremium ? 'Tem a certeza?' : 'Desbloqueie Todo o Potencial'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {isPremium 
                ? 'Ao fazer downgrade, perderá acesso a recursos premium imediatamente'
                : 'Acesso ilimitado a todas as funcionalidades premium por apenas €29/mês'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {isPremium ? (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  Perderá acesso ao Snack Bar, carregamento de cartões e métricas avançadas.
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Gestão completa do Snack Bar</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Carregamento de cartões para campistas</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Métricas e relatórios financeiros</span>
                </li>
              </ul>
            )}

            <div className="flex justify-end gap-4 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTierChange}
                disabled={isLoading}
                className="min-w-[120px]"
                variant={isPremium ? 'destructive' : 'default'}
              >
                {isLoading 
                  ? (isPremium ? 'A fazer downgrade...' : 'A fazer upgrade...') 
                  : (isPremium ? 'Sim, fazer downgrade' : 'Fazer Upgrade')
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
} 