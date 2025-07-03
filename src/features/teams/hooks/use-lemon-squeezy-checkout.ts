import { useState } from 'react'
import { toast } from 'sonner'
import type { Team } from '../types'

interface UseCheckoutOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useLemonSqueezyCheckout(options?: UseCheckoutOptions) {
  const [isLoading, setIsLoading] = useState(false)

  const initiateCheckout = async (team: Team) => {
    try {
      setIsLoading(true)
      toast.loading('Preparando checkout...', {
        description: 'Redirecionando para pagamento seguro',
      })

      // Chamar o backend para criar o checkout
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Utilizador não autenticado')
      }
      const response = await fetch('/api/lemon-squeezy/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          teamName: team.name,
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro ao criar checkout: ${errorText}`)
      }
      const data = await response.json()
      const checkoutUrl = data.checkoutUrl

      // Brief delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.dismiss()

      // Store checkout info for potential return handling
      sessionStorage.setItem('lemon_squeezy_checkout', JSON.stringify({
        teamId: team.id,
        checkoutUrl,
        timestamp: Date.now(),
      }))

      // Abrir o checkout numa nova tab
      window.open(checkoutUrl, '_blank')
      options?.onSuccess?.()
    } catch (error) {
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