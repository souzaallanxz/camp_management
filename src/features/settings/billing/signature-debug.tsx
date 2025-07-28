import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { buildApiUrl } from '@/services/api'

export function SignatureDebug() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    signatureValid: boolean
    secretConfigured: boolean
    headers: Record<string, string>
    body: Record<string, unknown>
  } | null>(null)

  const testSignature = async () => {
    try {
      setIsLoading(true)
      toast.loading('Testando validação de assinatura...')

      // Simular um payload típico do Lemon Squeezy
      const testPayload = {
        meta: {
          event_name: 'checkout_completed',
          custom_data: {
            teamId: 'test-team-id',
            planType: 'premium'
          }
        },
        data: {
          id: 'test-subscription-id',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            variant_id: '883664',
            custom_data: {
              teamId: 'test-team-id',
              planType: 'premium',
              timestamp: new Date().toISOString()
            }
          }
        }
      }

      const response = await fetch(buildApiUrl('/lemon-squeezy/test-signature'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature-for-debug'
        },
        body: JSON.stringify(testPayload)
      })

      const data = await response.json()
      toast.dismiss()

      if (response.ok) {
        setResult(data)
        toast.success('Teste de assinatura concluído', {
          description: `Válida: ${data.signatureValid ? 'Sim' : 'Não'}`
        })
      } else {
        toast.error('Erro ao testar assinatura', {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug de Assinatura do Webhook</CardTitle>
        <CardDescription>
          Teste a validação de assinatura do webhook do Lemon Squeezy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testSignature} 
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Testando...' : 'Testar Validação de Assinatura'}
        </Button>
        
        {result && (
          <div className="space-y-2">
            <h4 className="font-semibold">Resultado:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Assinatura Válida:</strong> {result.signatureValid ? 'Sim' : 'Não'}</p>
              <p><strong>Secret Configurado:</strong> {result.secretConfigured ? 'Sim' : 'Não'}</p>
            </div>
            
            <details className="text-xs">
              <summary className="cursor-pointer">Ver detalhes completos</summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>Este teste simula um webhook do Lemon Squeezy e verifica se a validação de assinatura está funcionando.</p>
          <p>Em desenvolvimento, a validação de assinatura está desabilitada para facilitar os testes.</p>
        </div>
      </CardContent>
    </Card>
  )
} 