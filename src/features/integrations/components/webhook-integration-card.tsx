import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  const [isLoading, setIsLoading] = useState(false)

  // Carregar configuração inicial
  useEffect(() => {
    async function fetchConfig() {
      const loadedConfig = await webhookService.loadConfig()
      setConfig(loadedConfig)
    }
    fetchConfig()
  }, [])

  const handleConnect = async () => {
    if (isLoading) return // Prevent multiple clicks
    
    if (config.isConnected && hasActiveWebhooks) {
      setIsLoading(true)
      try {
        // Properly disable any active webhooks
        let updatedConfig = config
        
        // Desabilitar webhooks ativos
        const promises = []
        if (config.registrationWebhook) {
          promises.push(webhookService.disableWebhook('registrations'))
        }
        if (config.paymentWebhook) {
          promises.push(webhookService.disableWebhook('payments'))
        }
        
        // Aguardar todas as operações
        if (promises.length > 0) {
          const results = await Promise.all(promises)
          updatedConfig = results[results.length - 1] // Usar o último resultado
        }
        
        // Update state with the returned config
        setConfig(updatedConfig)
        toast.success('Webhooks desconectados com sucesso')
      } catch {
        toast.error('Falha ao desconectar webhooks')
        // Reload config to ensure we have the latest state
        const loadedConfig = await webhookService.loadConfig()
        setConfig(loadedConfig)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Se não está conectado ou não há webhooks ativos, abrir diálogo
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

  // Verificar se realmente há webhooks ativos
  const hasActiveWebhooks = config.registrationWebhook || config.paymentWebhook

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
      <Card className="relative overflow-hidden h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <IconWebhook className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Webhook</CardTitle>
                <CardDescription className="text-xs">
                  Receba notificações em tempo real
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="webhook-active" className="text-sm font-medium">
                {config.isConnected ? 'Ativo' : 'Inativo'}
              </Label>
              <Switch
                id="webhook-active"
                checked={config.isConnected}
                onCheckedChange={(checked) => {
                  if (checked && !config.isConnected) {
                    handleConnect()
                  } else if (!checked && config.isConnected) {
                    handleConnect()
                  }
                }}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
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
          </div>

          <Separator className="my-3" />

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Reload config
                window.location.reload()
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfigClick}
              disabled={isLoading}
            >
              <IconSettings className="mr-2 h-4 w-4" />
              Configurar
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