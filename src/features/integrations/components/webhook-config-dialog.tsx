import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { webhookService } from '../services/webhook-service'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'

interface WebhookConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (config: Awaited<ReturnType<typeof webhookService.loadConfig>>) => void
}

export function WebhookConfigDialog({ open, onOpenChange, onSave }: WebhookConfigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Awaited<ReturnType<typeof webhookService.loadConfig>>>({
    apiKey: '',
    registrationWebhook: false,
    paymentWebhook: false,
    isConnected: false,
    registrationWebhookUrl: '',
    paymentWebhookUrl: '',
    hookdeckData: {}
  })

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  const loadConfig = async () => {
    try {
      const loadedConfig = await webhookService.loadConfig()
      setConfig(loadedConfig)
    } catch {
      toast.error('Failed to load webhook configuration')
    }
  }

  const handleToggleWebhook = async (type: 'registrations' | 'payments') => {
    setLoading(true)
    try {
      const isEnabled = type === 'registrations' ? config.registrationWebhook : config.paymentWebhook
      const updatedConfig = isEnabled
        ? await webhookService.disableWebhook(type)
        : await webhookService.enableWebhook(type)
      setConfig(updatedConfig)
      toast.success(`Webhook ${isEnabled ? 'disabled' : 'enabled'} successfully`)
      onSave?.(updatedConfig)
    } catch {
      toast.error(`Failed to ${type === 'registrations' ? config.registrationWebhook ? 'disable' : 'enable' : config.paymentWebhook ? 'disable' : 'enable'} webhook`)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateApiKey = async () => {
    setLoading(true)
    try {
      const newApiKey = webhookService.generateApiKey()
      const updatedConfig = {
        ...config,
        apiKey: newApiKey
      }
      await webhookService.saveConfig(updatedConfig)
      setConfig(updatedConfig)
      toast.success('API Key regenerada com sucesso')
      onSave?.(updatedConfig)
    } catch {
      toast.error('Failed to regenerate API Key')
    } finally {
      setLoading(false)
    }
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(config.apiKey)
    toast.success('API Key copiada para a área de transferência!')
  }

  const copyWebhookUrl = (url: string, type: string) => {
    navigator.clipboard.writeText(url)
    toast.success(`URL do webhook ${type} copiada!`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="mb-1">Configuração de Webhooks</DialogTitle>
          <DialogDescription className="mb-4">
            Configure os webhooks para inscrições e pagamentos. Ative/desative, copie URLs e gerencie sua API Key.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* API Key Section */}
          <div>
            <Label className="block mb-1 text-sm font-medium">API Key</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={config.apiKey}
                readOnly
                className="font-mono text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyApiKey}
                disabled={loading}
                title="Copiar API Key"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateApiKey}
                disabled={loading}
                title="Regenerar API Key"
              >
                Regenerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use esta chave para autenticar requisições de webhook.
            </p>
          </div>

          {/* Webhook Registration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="registration-webhook" className="font-medium">
                Webhook de Inscrições
              </Label>
              <Switch
                id="registration-webhook"
                checked={config.registrationWebhook}
                onCheckedChange={() => handleToggleWebhook('registrations')}
                disabled={loading}
              />
            </div>
            {config.registrationWebhookUrl && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={config.registrationWebhookUrl}
                  readOnly
                  className="font-mono text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyWebhookUrl(config.registrationWebhookUrl!, 'registrations')}
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Receba notificações de novas inscrições.
            </p>
          </div>

          {/* Webhook Payment */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="payment-webhook" className="font-medium">
                Webhook de Pagamentos
              </Label>
              <Switch
                id="payment-webhook"
                checked={config.paymentWebhook}
                onCheckedChange={() => handleToggleWebhook('payments')}
                disabled={loading}
              />
            </div>
            {config.paymentWebhookUrl && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={config.paymentWebhookUrl}
                  readOnly
                  className="font-mono text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyWebhookUrl(config.paymentWebhookUrl!, 'payments')}
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Receba notificações de pagamentos realizados.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)} className="ml-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 