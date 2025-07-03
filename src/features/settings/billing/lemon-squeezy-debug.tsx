import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function LemonSqueezyDebug() {
  const [lemonSqueezyStatus, setLemonSqueezyStatus] = useState<{
    loaded: boolean
    methods: string[]
    error?: string
  }>({
    loaded: false,
    methods: []
  })

  const [checkoutUrl, setCheckoutUrl] = useState<string>('')

  useEffect(() => {
    const checkLemonSqueezy = async () => {
      const methods: string[] = []
      
      try {
        // Try to ensure Lemon Squeezy is loaded
        if (window.ensureLemonSqueezyLoaded) {
          await window.ensureLemonSqueezyLoaded()
        }
        
        if (window.LemonSqueezy) {
          methods.push('LemonSqueezy object exists')
          
          if (window.LemonSqueezy.Setup) {
            methods.push('Setup method available')
          }
          
          if (window.LemonSqueezy.Url) {
            methods.push('Url object available')
            
            if (window.LemonSqueezy.Url.open) {
              methods.push('Url.open method available')
            }
            
            if (window.LemonSqueezy.Url.Open) {
              methods.push('Url.Open method available')
            }
          }
          
          if (window.LemonSqueezy.open) {
            methods.push('Direct open method available')
          }
          
          setLemonSqueezyStatus({
            loaded: true,
            methods
          })
        } else {
          setLemonSqueezyStatus({
            loaded: false,
            methods: [],
            error: 'LemonSqueezy not found in window object'
          })
        }
      } catch (error) {
        setLemonSqueezyStatus({
          loaded: false,
          methods: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Check immediately
    checkLemonSqueezy()
    
    // Check again after a delay
    const timer = setTimeout(checkLemonSqueezy, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  const testCheckoutCreation = async () => {
    try {
      toast.loading('Criando checkout de teste...')
      
      const token = localStorage.getItem('token')
      const { buildApiUrl } = await import('@/services/api')
      const apiUrl = buildApiUrl('/lemon-squeezy/checkout')
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          planType: 'premium', 
          returnUrl: window.location.origin + '/settings/billing' 
        }),
      })
      
      const data = await res.json()
      toast.dismiss()
      
      if (!res.ok || !data.url) {
        toast.error('Erro ao criar checkout', { 
          description: data.error || 'Erro desconhecido' 
        })
        return
      }
      
      setCheckoutUrl(data.url)
      toast.success('Checkout criado com sucesso!', {
        description: 'URL disponível para teste'
      })
      
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao criar checkout', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  const testOverlay = () => {
    if (!checkoutUrl) {
      toast.error('Crie um checkout primeiro')
      return
    }

    if (!window.LemonSqueezy) {
      toast.error('Lemon Squeezy não está disponível')
      return
    }

    try {
      // Tentar método Setup primeiro
      if (window.LemonSqueezy.Setup) {
        console.log('Testing Setup method...')
        const checkout = window.LemonSqueezy.Setup({
          checkout: checkoutUrl
        })
        checkout.open()
        toast.success('Overlay aberto com Setup method')
        return
      }
      
      // Tentar Url.open
      if (window.LemonSqueezy.Url?.open) {
        console.log('Testing Url.open method...')
        window.LemonSqueezy.Url.open(checkoutUrl)
        toast.success('Overlay aberto com Url.open method')
        return
      }
      
      // Tentar open direto
      if (window.LemonSqueezy.open) {
        console.log('Testing direct open method...')
        window.LemonSqueezy.open(checkoutUrl)
        toast.success('Overlay aberto com direct open method')
        return
      }
      
      toast.error('Nenhum método de overlay disponível')
      
    } catch (error) {
      console.error('Error opening overlay:', error)
      toast.error('Erro ao abrir overlay', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  const openInNewWindow = () => {
    if (!checkoutUrl) {
      toast.error('Crie um checkout primeiro')
      return
    }
    
    window.open(checkoutUrl, '_blank')
    toast.success('Checkout aberto em nova janela')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Lemon Squeezy</CardTitle>
        <CardDescription>
          Verificar se o Lemon Squeezy está carregando corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={lemonSqueezyStatus.loaded ? "default" : "destructive"}>
              {lemonSqueezyStatus.loaded ? "Carregado" : "Não carregado"}
            </Badge>
          </div>
          
          {lemonSqueezyStatus.error && (
            <div className="text-sm text-red-600">
              <strong>Erro:</strong> {lemonSqueezyStatus.error}
            </div>
          )}
          
          <div className="text-sm">
            <strong>Métodos disponíveis:</strong>
            {lemonSqueezyStatus.methods.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {lemonSqueezyStatus.methods.map((method, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {method}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhum método disponível</p>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={testCheckoutCreation}
            variant="outline"
            className="w-full"
          >
            Criar Checkout de Teste
          </Button>
          
          {checkoutUrl && (
            <div className="space-y-2">
              <div className="text-sm">
                <strong>URL do Checkout:</strong>
                <div className="mt-1 p-2 bg-muted rounded text-xs break-all">
                  {checkoutUrl}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={testOverlay}
                  disabled={!lemonSqueezyStatus.loaded}
                  className="flex-1"
                >
                  Testar Overlay
                </Button>
                
                <Button 
                  onClick={openInNewWindow}
                  variant="outline"
                  className="flex-1"
                >
                  Abrir em Nova Janela
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Este componente ajuda a diagnosticar problemas com o Lemon Squeezy.</p>
          <p>Verifique o console do navegador para mais detalhes.</p>
        </div>
      </CardContent>
    </Card>
  )
} 