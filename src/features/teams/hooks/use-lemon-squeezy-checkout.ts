import { useState } from 'react'
import { toast } from 'sonner'
import { createCheckout, PREMIUM_PLAN } from '@/services/lemon-squeezy.service'
import type { Team } from '../types'

interface UseCheckoutOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  onUpgrade?: () => void // callback opcional para quando o tier mudar
}

// Polling para verificar se o tier mudou para premium
async function pollForUpgrade(teamId: string, onUpgrade: () => void, maxTries = 20, interval = 2000) {
  let tries = 0
  while (tries < maxTries) {
    tries++
    try {
      const res = await fetch(`/api/teams/current`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.tier === 'premium') {
          onUpgrade()
          return
        }
      }
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, interval))
  }
}

// Adicionar declaração global para LemonSqueezy
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LemonSqueezy não tem tipos oficiais
declare global {
  interface Window {
    LemonSqueezy?: any;
  }
}

export function useLemonSqueezyCheckout(options?: UseCheckoutOptions) {
  const [isLoading, setIsLoading] = useState(false)

  const initiateCheckout = async (team: Team) => {
    // Validate configuration
    if (PREMIUM_PLAN.variantId === '0') {
      const error = new Error('Produto Premium ainda não configurado. Consulte LEMON_SQUEEZY_SETUP.md')
      options?.onError?.(error)
      toast.error('Configuração Pendente', {
        description: 'O produto Premium ainda não foi configurado no Lemon Squeezy.',
      })
      return
    }

    try {
      setIsLoading(true)
      
      toast.loading('Preparando checkout...', {
        description: 'Abrindo pagamento seguro',
      })

      // Criar checkout embed (overlay)
      const returnUrl = window.location.origin + '/settings/billing'
      const checkoutUrl = await createCheckout({
        storeId: PREMIUM_PLAN.storeId,
        variantId: PREMIUM_PLAN.variantId,
        customData: {
          teamId: team.id,
          planType: 'premium',
          teamName: team.name,
          timestamp: new Date().toISOString(),
        },
        customerName: team.name,
        returnUrl,
      })

      toast.dismiss()
      
      // Abrir overlay Lemon Squeezy
      if (window.LemonSqueezy && window.LemonSqueezy.Url && typeof window.LemonSqueezy.Url.open === 'function') {
        window.LemonSqueezy.Url.open(checkoutUrl)
      } else {
        toast.error('Overlay Lemon Squeezy não disponível', {
          description: 'Verifique se o script lemon.js está incluído no index.html',
        })
        return
      }

      // Polling para atualizar o tier após pagamento
      if (options?.onUpgrade) {
        pollForUpgrade(team.id, options.onUpgrade)
      }
      options?.onSuccess?.()
      
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Checkout error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      toast.dismiss()
      toast.error('Erro ao Iniciar Pagamento', {
        description: errorMessage,
      })
      
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    initiateCheckout,
    isLoading,
  }
} 