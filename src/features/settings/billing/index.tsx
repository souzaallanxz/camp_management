import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'
import { Badge } from '@/components/ui/badge'
import { TestLemonSqueezy } from '@/test-lemon-squeezy'
import { TestWebhook } from './test-webhook'
import { LemonSqueezyDebug } from './lemon-squeezy-debug'
import { SignatureDebug } from './signature-debug'
import { CorsDebug } from './cors-debug'
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
      
      // eslint-disable-next-line no-console
      console.log('Checkout URL received:', data.url)
      
      // Função para aguardar o Lemon Squeezy estar disponível
      const waitForLemonSqueezy = async () => {
        try {
          // eslint-disable-next-line no-console
          console.log('Waiting for Lemon Squeezy to be available...');
          
          // Use the global ensure function if available
          if (window.ensureLemonSqueezyLoaded) {
            await window.ensureLemonSqueezyLoaded();
            // eslint-disable-next-line no-console
            console.log('Lemon Squeezy loaded successfully via ensureLemonSqueezyLoaded');
            return true;
          }
          
          // Fallback to polling method
          return new Promise<boolean>((resolve) => {
            let attempts = 0;
            const maxAttempts = 20;
            const interval = 500;
            
            const checkLemonSqueezy = () => {
              attempts++;
              // eslint-disable-next-line no-console
              console.log(`Checking Lemon Squeezy availability (attempt ${attempts})`);
              
              if (window.LemonSqueezy) {
                // eslint-disable-next-line no-console
                console.log('Lemon Squeezy is available:', window.LemonSqueezy);
                resolve(true);
                return;
              }
              
              if (attempts >= maxAttempts) {
                // eslint-disable-next-line no-console
                console.error('Lemon Squeezy not available after maximum attempts');
                resolve(false);
                return;
              }
              
              setTimeout(checkLemonSqueezy, interval);
            };
            
            checkLemonSqueezy();
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error waiting for Lemon Squeezy:', error);
          return false;
        }
      };
      
      // Função para tentar abrir o overlay
      const openOverlay = () => {
        // eslint-disable-next-line no-console
        console.log('Available Lemon Squeezy methods:', {
          Setup: window.LemonSqueezy?.Setup,
          Url: window.LemonSqueezy?.Url,
          open: window.LemonSqueezy?.open
        });
        
        // Método 1: Usar Setup (recomendado)
        if (window.LemonSqueezy?.Setup && typeof window.LemonSqueezy.Setup === 'function') {
          // eslint-disable-next-line no-console
          console.log('Opening Lemon Squeezy overlay with Setup...')
          try {
            const checkout = window.LemonSqueezy.Setup({
              checkout: data.url
            });
            checkout.open();
            return true;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error with Setup method:', error);
          }
        }
        
        // Método 2: Usar Url.open
        if (window.LemonSqueezy?.Url?.open && typeof window.LemonSqueezy.Url.open === 'function') {
          // eslint-disable-next-line no-console
          console.log('Opening Lemon Squeezy overlay with Url.open...')
          try {
            window.LemonSqueezy.Url.open(data.url);
            return true;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error with Url.open method:', error);
          }
        }
        
        // Método 3: Usar open direto
        if (window.LemonSqueezy?.open && typeof window.LemonSqueezy.open === 'function') {
          // eslint-disable-next-line no-console
          console.log('Opening Lemon Squeezy with direct open method...')
          try {
            window.LemonSqueezy.open(data.url);
            return true;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error with direct open method:', error);
          }
        }
        
        return false;
      };
      
      // Aguardar o Lemon Squeezy estar disponível e tentar abrir o overlay
      const lemonSqueezyAvailable = await waitForLemonSqueezy();
      
      if (lemonSqueezyAvailable) {
        // Aguardar um pouco para a inicialização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!openOverlay()) {
          // eslint-disable-next-line no-console
          console.error('Lemon Squeezy available but overlay method not found')
          toast.error('Método de overlay não encontrado', { 
            description: 'Abrindo checkout em nova janela...' 
          })
          window.open(data.url, '_blank')
        } else {
          toast.success('Abrindo checkout...')
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('Lemon Squeezy not available after waiting')
        toast.error('Lemon Squeezy não disponível', { 
          description: 'Abrindo checkout em nova janela...' 
        })
        window.open(data.url, '_blank')
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
      
      <div className="mt-8 border-t pt-6">
        <TestWebhook />
      </div>
      
      <div className="mt-8 border-t pt-6">
        <LemonSqueezyDebug />
      </div>
      
      <div className="mt-8 border-t pt-6">
        <SignatureDebug />
      </div>
      
      <div className="mt-8 border-t pt-6">
        <CorsDebug />
      </div>
    </div>
  )
} 