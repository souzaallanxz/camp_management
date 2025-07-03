import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { Badge } from '@/components/ui/badge'
import { TestLemonSqueezy } from '@/test-lemon-squeezy'
import { toast } from 'sonner'

export default function SettingsBilling() {
  const { teams } = useTeamData()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const currentTeam = teams[0]
  const isPremium = currentTeam?.tier === 'premium'
  const [isLoading, setIsLoading] = useState(false)

  // Função para abrir overlay Lemon Squeezy
  const handleUpgrade = async () => {
    try {
      setIsLoading(true)
      toast.loading('A preparar pagamento...')
      const token = localStorage.getItem('token')
      
      // Use the buildApiUrl function to get the correct backend URL
      const { buildApiUrl } = await import('@/services/api')
      const apiUrl = buildApiUrl('/lemon-squeezy/checkout')
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planType: 'premium', returnUrl: window.location.origin + '/settings/billing' }),
      })
      const data = await res.json()
      toast.dismiss()
      if (!res.ok || !data.url) {
        toast.error('Erro ao criar checkout', { description: data.error || 'Erro desconhecido' })
        return
      }
      
      console.log('Checkout URL received:', data.url)
      console.log('LemonSqueezy object:', window.LemonSqueezy)
      console.log('LemonSqueezy.Url:', window.LemonSqueezy?.Url)
      
      // Função para tentar abrir o overlay
      const openOverlay = () => {
        if (window.LemonSqueezy && window.LemonSqueezy.Url && typeof window.LemonSqueezy.Url.open === 'function') {
          console.log('Opening Lemon Squeezy overlay...')
          window.LemonSqueezy.Url.open(data.url)
          return true
        }
        return false
      }
      
      // Tentar abrir imediatamente
      if (!openOverlay()) {
        console.log('Lemon Squeezy not ready, waiting...')
        // Se não estiver pronto, aguardar um pouco e tentar novamente
        setTimeout(() => {
          if (!openOverlay()) {
            console.error('Lemon Squeezy overlay still not available after timeout')
            toast.error('Overlay Lemon Squeezy não disponível', { 
              description: 'Abrindo checkout em nova janela...' 
            })
            // Fallback: abrir em nova janela
            window.open(data.url, '_blank')
          }
        }, 1000) // Aguardar 1 segundo
      }
    } catch (err) {
      toast.dismiss()
      toast.error('Erro ao criar checkout', { description: err instanceof Error ? err.message : 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Plano de Subscrição</h3>
        <p className="text-sm text-muted-foreground">
          Escolha o plano que melhor se adequa às suas necessidades
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative">
          <div className="absolute right-2 top-2">
            {!isPremium && (
              <Badge variant="secondary">
                Atual
              </Badge>
            )}
          </div>
          <CardHeader>
            <CardTitle>Plano Gratuito</CardTitle>
            <CardDescription>Perfeito para começar</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="text-2xl font-bold">
              €0 <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Inscrições
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gestão de Campistas com Onboarding
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gestão de Acampamentos
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPremium ? (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Fazer Downgrade
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Plano Atual
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="relative">
          <div className="absolute right-2 top-2">
            {isPremium && (
              <Badge>
                Atual
              </Badge>
            )}
          </div>
          <CardHeader>
            <CardTitle>Plano Premium</CardTitle>
            <CardDescription>Todas as funcionalidades disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="text-2xl font-bold">
              €19 <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Inscrições
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gestão de Campistas com Onboarding
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gestão de Acampamentos
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Carregamento de cartões
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Gestão de snack bar
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Métricas de carregamentos
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {!isPremium ? (
              <Button 
                className="w-full"
                onClick={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? 'A preparar...' : 'Fazer Upgrade - €19/mês'}
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Plano Atual
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <TierUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
      
      <div className="mt-8 border-t pt-6">
        <TestLemonSqueezy />
      </div>
    </div>
  )
} 