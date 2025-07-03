import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createCheckout, PREMIUM_PLAN } from '@/services/lemon-squeezy.service'
import { toast } from 'sonner'

export function TestLemonSqueezy() {
  const [isLoading, setIsLoading] = useState(false)

  const testCheckout = async () => {
    try {
      setIsLoading(true)
      
      // eslint-disable-next-line no-console
      console.log('🔍 Testing Lemon Squeezy with config:', PREMIUM_PLAN)
      
      const checkoutUrl = await createCheckout({
        storeId: PREMIUM_PLAN.storeId,
        variantId: PREMIUM_PLAN.variantId,
        customData: {
          teamId: 'test-team',
          planType: 'premium',
          teamName: 'Test Team',
          timestamp: new Date().toISOString(),
        },
        customerName: 'Test Team',
      })

      // eslint-disable-next-line no-console
      console.log('✅ Checkout URL created:', checkoutUrl)
      
      // Testar se o Lemon Squeezy está disponível
      if (window.LemonSqueezy) {
        // eslint-disable-next-line no-console
        console.log('✅ Lemon Squeezy is available:', window.LemonSqueezy)
        
        // Tentar abrir o overlay
        if (typeof window.LemonSqueezy.Url?.open === 'function') {
          // eslint-disable-next-line no-console
          console.log('✅ Opening Lemon Squeezy overlay...')
          window.LemonSqueezy.Url.open(checkoutUrl)
        } else if (typeof window.LemonSqueezy.open === 'function') {
          // eslint-disable-next-line no-console
          console.log('✅ Opening Lemon Squeezy with direct method...')
          window.LemonSqueezy.open(checkoutUrl)
        } else {
          // eslint-disable-next-line no-console
          console.warn('⚠️ Lemon Squeezy available but no open method found')
          toast.warning('Lemon Squeezy disponível mas método de abertura não encontrado', {
            description: checkoutUrl,
          })
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Lemon Squeezy not available')
        toast.warning('Lemon Squeezy não disponível', {
          description: checkoutUrl,
        })
      }
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Checkout error:', error)
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Test Lemon Squeezy</h2>
      <p className="mb-4">Config: Store {PREMIUM_PLAN.storeId}, Variant {PREMIUM_PLAN.variantId}</p>
      <Button onClick={testCheckout} disabled={isLoading}>
        {isLoading ? 'Testing...' : 'Test Checkout Creation'}
      </Button>
    </div>
  )
} 