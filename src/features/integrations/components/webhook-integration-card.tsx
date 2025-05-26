import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconWebhook, IconSettings, IconCheck } from '@tabler/icons-react'
import { useState } from 'react'

export function WebhookIntegrationCard() {
  const [isConnected, setIsConnected] = useState(false)

  const handleConnect = () => {
    // Aqui será implementada a lógica de conexão do webhook
    setIsConnected(!isConnected)
  }

  return (
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
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
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
        <p className="text-sm text-muted-foreground">
          Configure webhooks para receber notificações automáticas sobre eventos importantes como novas inscrições, pagamentos e atualizações de status.
        </p>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleConnect}
            variant={isConnected ? "outline" : "default"}
            className="flex-1"
          >
            {isConnected ? "Desconectar" : "Conectar"}
          </Button>
          <Button variant="outline" size="icon">
            <IconSettings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 