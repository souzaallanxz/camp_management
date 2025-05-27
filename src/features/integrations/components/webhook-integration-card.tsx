import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconWebhook, IconSettings, IconCheck } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { WebhookConfigDialog } from './webhook-config-dialog'
import { webhookService, type WebhookConfig } from '../services/webhook-service'
import { toast } from 'sonner'

export function WebhookIntegrationCard() {
  const [config, setConfig] = useState<WebhookConfig>({
    apiKey: '',
    registrationWebhook: false,
    paymentWebhook: false,
    isConnected: false,
    registrationWebhookUrl: '',
    paymentWebhookUrl: '',
    hookdeckData: {}
  })
  const [showConfigDialog, setShowConfigDialog] = useState(false)

  // Carregar configuração inicial
  useEffect(() => {
    async function fetchConfig() {
      const loadedConfig = await webhookService.loadConfig()
      setConfig(loadedConfig)
    }
    fetchConfig()
  }, [])

  const handleConnect = async () => {
    if (config.isConnected) {
      try {
        // Properly disable any active webhooks
        if (config.registrationWebhook) {
          await webhookService.disableWebhook('registrations')
        }
        if (config.paymentWebhook) {
          await webhookService.disableWebhook('payments')
        }
        // Reload config to ensure we have the latest state
        const loadedConfig = await webhookService.loadConfig()
        setConfig(loadedConfig)
      } catch {
        toast.error('Failed to disconnect webhooks')
      }
    } else {
      setShowConfigDialog(true)
    }
  }

  const handleConfigClick = () => {
    setShowConfigDialog(true)
  }

  const handleConfigSave = (newConfig: WebhookConfig) => {
    setConfig(newConfig)
  }

  const getActiveWebhooksCount = () => {
    let count = 0
    if (config.registrationWebhook) count++
    if (config.paymentWebhook) count++
    return count
  }

  const getWebhookDescription = () => {
    const activeCount = getActiveWebhooksCount()
    if (activeCount === 0) {
      return 'Nenhum webhook ativo'
    } else if (activeCount === 1) {
      return '1 webhook ativo'
    } else {
      return `${activeCount} webhooks ativos`
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <IconWebhook className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Webhook</CardTitle>
                <CardDescription>
                  Receba notificações em tempo real
                </CardDescription>
              </div>
            </div>
            <Badge variant={config.isConnected ? "default" : "secondary"}>
              {config.isConnected ? (
                <>
                  <IconCheck className="mr-1 h-3 w-3" />
                  Conectado
                </>
              ) : (
                "Desconectado"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Configure webhooks para receber notificações automáticas sobre eventos importantes como novas inscrições, pagamentos e atualizações de status.
            </p>
            {config.isConnected && (
              <p className="text-xs text-muted-foreground mt-2">
                {getWebhookDescription()}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleConnect}
              variant={config.isConnected ? "outline" : "default"}
              className="flex-1"
            >
              {config.isConnected ? "Desconectar" : "Conectar"}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleConfigClick}
              disabled={!config.isConnected}
            >
              <IconSettings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <WebhookConfigDialog 
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onSave={handleConfigSave}
      />
    </>
  )
} 