import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { getTeamIdHeader } from '@/lib/auth'
import { buildApiUrl } from '@/services/api'

export function TestWebhook() {
  const { teams } = useTeamData()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingTier, setIsCheckingTier] = useState(false)
  const currentTeam = teams[0]

  const testWebhook = async () => {
    if (!currentTeam) {
      toast.error('Nenhum time encontrado')
      return
    }

    try {
      setIsLoading(true)
      toast.loading('Testando webhook...')

      const response = await fetch(
        `${buildApiUrl('/lemon-squeezy/test')}?teamId=${currentTeam.id}`,
        {
          method: 'GET',
          headers: {
            ...getTeamIdHeader(),
          },
        }
      )

      const data = await response.json()
      toast.dismiss()

      if (response.ok) {
        toast.success('Webhook testado com sucesso!', {
          description: `Time ${data.teamId} atualizado para ${data.planType}`,
        })
      } else {
        toast.error('Erro ao testar webhook', {
          description: data.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao testar webhook', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkTier = async () => {
    if (!currentTeam) {
      toast.error('Nenhum time encontrado')
      return
    }

    try {
      setIsCheckingTier(true)
      toast.loading('Verificando tier...')

      const response = await fetch(
        buildApiUrl(`/teams/${currentTeam.id}/tier`),
        {
          method: 'GET',
          headers: {
            ...getTeamIdHeader(),
          },
        }
      )

      const data = await response.json()
      toast.dismiss()

      if (response.ok) {
        toast.success('Tier atual:', {
          description: `Tier: ${data.tier}`,
        })
      } else {
        toast.error('Erro ao verificar tier', {
          description: data.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Erro ao verificar tier', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setIsCheckingTier(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Webhook Lemon Squeezy</CardTitle>
        <CardDescription>
          Teste o webhook para verificar se está funcionando corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Time atual:</strong> {currentTeam?.name || 'N/A'}</p>
          <p><strong>Tier atual:</strong> {currentTeam?.tier || 'N/A'}</p>
          <p><strong>ID do time:</strong> {currentTeam?.id || 'N/A'}</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testWebhook} 
            disabled={isLoading || !currentTeam}
            variant="outline"
          >
            {isLoading ? 'Testando...' : 'Testar Webhook'}
          </Button>
          
          <Button 
            onClick={checkTier} 
            disabled={isCheckingTier || !currentTeam}
            variant="outline"
          >
            {isCheckingTier ? 'Verificando...' : 'Verificar Tier'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Este teste simula um webhook do Lemon Squeezy e atualiza o tier do time para premium.</p>
          <p>Use para verificar se o webhook está processando corretamente os dados.</p>
        </div>
      </CardContent>
    </Card>
  )
} 