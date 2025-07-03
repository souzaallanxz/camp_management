import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCurrentTeam } from '@/features/teams/hooks/use-current-team'

export function WebhookDebug() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEndpoint, setIsCheckingEndpoint] = useState(false)
  const { data: currentTeam } = useCurrentTeam()

  const checkWebhookEndpoint = async () => {
    try {
      setIsCheckingEndpoint(true)
      toast.loading('Verificando endpoint do webhook...')
      
      const { buildApiUrl } = await import('@/services/api')
      const apiUrl = buildApiUrl('/webhooks/lemon-squeezy')
      
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await res.json()
      toast.dismiss()
      
      if (res.ok) {
        toast.success('Endpoint acessível!', {
          description: data.message
        })
        // eslint-disable-next-line no-console
        console.log('Webhook endpoint response:', data)
      } else {
        toast.error('Erro ao acessar endpoint', {
          description: data.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao verificar endpoint', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsCheckingEndpoint(false)
    }
  }

  const testWebhookSignature = async () => {
    try {
      setIsLoading(true)
      toast.loading('Testando assinatura do webhook...')
      
      const { buildApiUrl } = await import('@/services/api')
      const apiUrl = buildApiUrl('/lemon-squeezy/test-signature')
      
      const testPayload = {
        meta: {
          event_name: 'checkout_completed'
        },
        data: {
          id: 'test-subscription-id',
          attributes: {
            status: 'active',
            variant_id: '883664',
            custom_data: {
              teamId: currentTeam?.id || 'test-team',
              planType: 'premium',
              timestamp: new Date().toISOString()
            }
          }
        }
      }
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature'
        },
        body: JSON.stringify(testPayload),
      })
      
      const data = await res.json()
      toast.dismiss()
      
      if (res.ok) {
        toast.success('Teste de assinatura concluído', {
          description: `Assinatura válida: ${data.signatureValid ? 'Sim' : 'Não'}`
        })
        // eslint-disable-next-line no-console
        console.log('Signature test response:', data)
      } else {
        toast.error('Erro no teste de assinatura', {
          description: data.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao testar assinatura', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const simulateWebhook = async () => {
    try {
      setIsLoading(true)
      toast.loading('Simulando webhook...')
      
      const { buildApiUrl } = await import('@/services/api')
      const apiUrl = buildApiUrl('/lemon-squeezy/test')
      
      const res = await fetch(`${apiUrl}?teamId=${currentTeam?.id || 'test-team'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await res.json()
      toast.dismiss()
      
      if (res.ok) {
        toast.success('Webhook simulado com sucesso!', {
          description: `Time ${data.teamId} atualizado para ${data.planType}`
        })
        // eslint-disable-next-line no-console
        console.log('Webhook simulation response:', data)
      } else {
        toast.error('Erro ao simular webhook', {
          description: data.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao simular webhook', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Webhook Lemon Squeezy</CardTitle>
        <CardDescription>
          Testar e verificar o funcionamento do webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Time atual:</span>
            <Badge variant="outline">
              {currentTeam?.name || 'N/A'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tier atual:</span>
            <Badge variant={currentTeam?.tier === 'premium' ? 'default' : 'secondary'}>
              {currentTeam?.tier || 'N/A'}
            </Badge>
          </div>
          
          <div className="text-sm">
            <strong>ID do time:</strong> {currentTeam?.id || 'N/A'}
          </div>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={checkWebhookEndpoint}
            disabled={isCheckingEndpoint}
            variant="outline"
            className="w-full"
          >
            {isCheckingEndpoint ? 'Verificando...' : 'Verificar Endpoint'}
          </Button>
          
          <Button 
            onClick={testWebhookSignature}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Testando...' : 'Testar Assinatura'}
          </Button>
          
          <Button 
            onClick={simulateWebhook}
            disabled={isLoading || !currentTeam}
            className="w-full"
          >
            {isLoading ? 'Simulando...' : 'Simular Webhook'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>URL do Webhook:</strong> https://camp-management-1.onrender.com/api/webhooks/lemon-squeezy</p>
          <p><strong>Signing Key:</strong> dany%&$e&2kPms</p>
          <p>Este componente ajuda a diagnosticar problemas com o webhook do Lemon Squeezy.</p>
          <p>Verifique o console do navegador e os logs do servidor para mais detalhes.</p>
        </div>
      </CardContent>
    </Card>
  )
} 