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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { webhookService } from '../services/webhook-service'
import { toast } from 'sonner'
import { Copy, FileText, Settings } from 'lucide-react'
import crypto from 'crypto'

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
      const newApiKey = crypto.randomUUID()
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

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="mb-1">Configuração de Webhooks</DialogTitle>
          <DialogDescription className="mb-4">
            Configure os webhooks para inscrições e pagamentos ou consulte a documentação.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentação
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-6 mt-6">
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
          </TabsContent>
          
          <TabsContent value="docs" className="mt-6 space-y-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Documentação dos Webhooks</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use os endpoints abaixo para enviar dados para a plataforma via webhooks.
                </p>
              </div>

              {/* Registration Webhook Documentation */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  📝 Webhook de Inscrições
                </h4>
                <div>
                  <Label className="text-sm font-medium">Endpoint:</Label>
                  {config.registrationWebhookUrl ? (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">
                        {config.registrationWebhookUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.registrationWebhookUrl!, 'URL copiada!')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Ative o webhook para ver a URL</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Método:</Label>
                  <code className="bg-muted px-2 py-1 rounded text-xs ml-2">POST</code>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Payload exemplo:</Label>
                  <div className="mt-2 relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "name": "João Silva",
  "email": "joao@email.com",
  "contact": "+351912345678",
  "camp_id": "uuid-do-acampamento",
  "form_id": "form_123",
  "id_number": "12345678",
  "sns_number": "123456789",
  "date_of_birth": "2010-05-15",
  "dietary_restrictions": "Vegetariano",
  "guardian_name": "Maria Silva",
  "guardian_email": "maria@email.com",
  "guardian_phone": "+351912345679"
}`}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`{
  "name": "João Silva",
  "email": "joao@email.com",
  "contact": "+351912345678",
  "camp_id": "uuid-do-acampamento",
  "form_id": "form_123",
  "id_number": "12345678",
  "sns_number": "123456789",
  "date_of_birth": "2010-05-15",
  "dietary_restrictions": "Vegetariano",
  "guardian_name": "Maria Silva",
  "guardian_email": "maria@email.com",
  "guardian_phone": "+351912345679"
}`, 'Exemplo copiado!')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Campos obrigatórios:</Label>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    <li><code>name</code> - Nome completo</li>
                    <li><code>email</code> - Email válido</li>
                    <li><code>contact</code> - Número de telefone</li>
                  </ul>
                </div>
              </div>

              {/* Payment Webhook Documentation */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  💳 Webhook de Pagamentos
                </h4>
                <div>
                  <Label className="text-sm font-medium">Endpoint:</Label>
                  {config.paymentWebhookUrl ? (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">
                        {config.paymentWebhookUrl}?request_id=SEU_REQUEST_ID
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.paymentWebhookUrl! + '?request_id=SEU_REQUEST_ID', 'URL copiada!')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Ative o webhook para ver a URL</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Método:</Label>
                  <code className="bg-muted px-2 py-1 rounded text-xs ml-2">POST</code>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Parâmetros de Query:</Label>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    <li><code>request_id</code> - ID único da requisição (obrigatório)</li>
                  </ul>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Payload exemplo:</Label>
                  <div className="mt-2 relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "amount": 150.00,
  "payment_method": "MB Way",
  "payment_status": "confirmed",
  "payment_date": "2025-01-02T20:30:50.771Z",
  "payment_link": "https://link-do-pagamento.com",
  "phone_number": "+351912345678"
}`}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`{
  "amount": 150.00,
  "payment_method": "MB Way",
  "payment_status": "confirmed",
  "payment_date": "2025-01-02T20:30:50.771Z",
  "payment_link": "https://link-do-pagamento.com",
  "phone_number": "+351912345678"
}`, 'Exemplo copiado!')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Campos obrigatórios:</Label>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    <li><code>amount</code> - Valor do pagamento</li>
                  </ul>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Como funciona:</Label>
                  <ol className="text-xs text-muted-foreground mt-1 list-decimal list-inside space-y-1">
                    <li>O <code>request_id</code> é passado como parâmetro de query na URL</li>
                    <li>O sistema processa o pagamento baseado no prefixo do <code>request_id</code>:</li>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li><code>R</code> - Confirma pagamento existente na tabela <code>payments</code></li>
                      <li><code>S</code> - Confirma pagamento existente na tabela <code>snackbar_balance</code></li>
                      <li>Outros prefixos - Cria novo pagamento na tabela <code>payments</code></li>
                    </ul>
                    <li>O sistema retorna os detalhes do pagamento processado</li>
                  </ol>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Exemplos de uso:</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <Label className="text-xs font-medium">Confirmar pagamento de inscrição:</Label>
                      <code className="bg-muted px-2 py-1 rounded text-xs block mt-1">
                        POST /api/webhooks/payments/{'{teamId}'}?request_id=R123456
                      </code>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Confirmar carregamento de snackbar:</Label>
                      <code className="bg-muted px-2 py-1 rounded text-xs block mt-1">
                        POST /api/webhooks/payments/{'{teamId}'}?request_id=S789012
                      </code>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Novo pagamento:</Label>
                      <code className="bg-muted px-2 py-1 rounded text-xs block mt-1">
                        POST /api/webhooks/payments/{'{teamId}'}?request_id=PAY_ABC123
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Format */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  📋 Formato de Resposta
                </h4>
                <div>
                  <Label className="text-sm font-medium">Resposta de sucesso:</Label>
                  <div className="mt-2 relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "status": "SUCCESS",
  "message": "Webhook received and processed successfully"
}`}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`{
  "status": "SUCCESS",
  "message": "Webhook received and processed successfully"
}`, 'Resposta copiada!')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Códigos de status:</Label>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-1">
                    <li><code>200</code> - Webhook processado com sucesso</li>
                    <li><code>400</code> - Dados inválidos ou campos obrigatórios em falta</li>
                    <li><code>404</code> - Inscrição não encontrada (apenas pagamentos)</li>
                    <li><code>500</code> - Erro interno do servidor</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)} className="ml-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 