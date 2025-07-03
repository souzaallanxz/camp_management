import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function CorsDebug() {
  const [status, setStatus] = useState<{
    scriptLoaded: boolean
    lemonSqueezyAvailable: boolean
    loadFunctionAvailable: boolean
    ensureFunctionAvailable: boolean
    error?: string
  }>({
    scriptLoaded: false,
    lemonSqueezyAvailable: false,
    loadFunctionAvailable: false,
    ensureFunctionAvailable: false
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = () => {
    setStatus({
      scriptLoaded: !!document.querySelector('script[src*="lemonsqueezy.com"]'),
      lemonSqueezyAvailable: !!window.LemonSqueezy,
      loadFunctionAvailable: !!window.loadLemonSqueezy,
      ensureFunctionAvailable: !!window.ensureLemonSqueezyLoaded
    })
  }

  const testDynamicLoad = async () => {
    try {
      setIsLoading(true)
      toast.loading('Testando carregamento dinâmico...')

      if (window.loadLemonSqueezy) {
        await window.loadLemonSqueezy()
        toast.success('Lemon Squeezy carregado com sucesso!')
        checkStatus()
      } else {
        toast.error('Função de carregamento não disponível')
      }
    } catch (error) {
      toast.error('Erro ao carregar Lemon Squeezy', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testEnsureLoad = async () => {
    try {
      setIsLoading(true)
      toast.loading('Testando ensureLemonSqueezyLoaded...')

      if (window.ensureLemonSqueezyLoaded) {
        await window.ensureLemonSqueezyLoaded()
        toast.success('Lemon Squeezy carregado com sucesso!')
        checkStatus()
      } else {
        toast.error('Função ensureLemonSqueezyLoaded não disponível')
      }
    } catch (error) {
      toast.error('Erro ao carregar Lemon Squeezy', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testCheckout = async () => {
    try {
      setIsLoading(true)
      toast.loading('Testando checkout...')

      if (!window.LemonSqueezy) {
        toast.error('Lemon Squeezy não disponível')
        return
      }

      // Test different methods
      const testUrl = 'https://app.lemonsqueezy.com/checkout/buy/test'
      
      if (window.LemonSqueezy.Setup) {
        const checkout = window.LemonSqueezy.Setup({ checkout: testUrl })
        checkout.open()
        toast.success('Checkout aberto com Setup method')
      } else if (window.LemonSqueezy.Url?.open) {
        window.LemonSqueezy.Url.open(testUrl)
        toast.success('Checkout aberto com Url.open method')
      } else if (window.LemonSqueezy.open) {
        window.LemonSqueezy.open(testUrl)
        toast.success('Checkout aberto com open method')
      } else {
        toast.error('Nenhum método de checkout disponível')
      }
    } catch (error) {
      toast.error('Erro ao abrir checkout', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug de CORS - Lemon Squeezy</CardTitle>
        <CardDescription>
          Verificar problemas de carregamento do script Lemon Squeezy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold">Status do Carregamento:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={status.scriptLoaded ? "default" : "secondary"}>
                {status.scriptLoaded ? "✓" : "✗"}
              </Badge>
              Script tag encontrado
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.lemonSqueezyAvailable ? "default" : "secondary"}>
                {status.lemonSqueezyAvailable ? "✓" : "✗"}
              </Badge>
              LemonSqueezy disponível
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.loadFunctionAvailable ? "default" : "secondary"}>
                {status.loadFunctionAvailable ? "✓" : "✗"}
              </Badge>
              loadLemonSqueezy disponível
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.ensureFunctionAvailable ? "default" : "secondary"}>
                {status.ensureFunctionAvailable ? "✓" : "✗"}
              </Badge>
              ensureLemonSqueezyLoaded disponível
            </div>
          </div>
        </div>

        {status.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <strong>Erro:</strong> {status.error}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={checkStatus} 
            variant="outline"
            size="sm"
          >
            Verificar Status
          </Button>
          
          <Button 
            onClick={testDynamicLoad} 
            disabled={isLoading || !status.loadFunctionAvailable}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Carregando...' : 'Testar Carregamento Dinâmico'}
          </Button>
          
          <Button 
            onClick={testEnsureLoad} 
            disabled={isLoading || !status.ensureFunctionAvailable}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Carregando...' : 'Testar Ensure Load'}
          </Button>
          
          <Button 
            onClick={testCheckout} 
            disabled={isLoading || !status.lemonSqueezyAvailable}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Testando...' : 'Testar Checkout'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Este componente ajuda a diagnosticar problemas de CORS e carregamento do Lemon Squeezy.</p>
          <p>Se o script não carregar, pode ser devido a:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Problemas de CORS</li>
            <li>Bloqueio de scripts externos</li>
            <li>Problemas de rede</li>
            <li>Configuração incorreta do CSP</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 