import { useState } from 'react'
import { toast } from 'sonner'
import { createCheckout, PREMIUM_PLAN } from '@/services/lemon-squeezy.service'
import type { Team } from '../types'

interface UseCheckoutOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
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
        description: 'Redirecionando para pagamento seguro',
      })

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
      })

      // Brief delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.dismiss()
      
      // Store checkout info for potential return handling
      sessionStorage.setItem('lemon_squeezy_checkout', JSON.stringify({
        teamId: team.id,
        checkoutUrl,
        timestamp: Date.now(),
      }))

      // Redirect to Lemon Squeezy checkout
      window.location.href = checkoutUrl
      
      options?.onSuccess?.()
      
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Checkout error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      toast.dismiss()
      toast.error('Erro ao Iniciar Pagamento', {
        description: errorMessage.includes('404') 
          ? 'Produto não encontrado. Verifique a configuração.'
          : errorMessage.includes('401')
          ? 'Erro de autenticação. Verifique a API key.'
          : errorMessage.includes('400')
          ? 'Dados inválidos. Verifique a configuração do produto.'
          : errorMessage,
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