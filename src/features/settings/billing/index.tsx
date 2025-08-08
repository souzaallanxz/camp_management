import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function SettingsBilling() {
  const { teams } = useTeamData()
  const currentTeam = teams[0]
  const isPremium = currentTeam?.tier === 'premium'

  const handleUpgrade = async () => {
    toast.info('Funcionalidade de upgrade em desenvolvimento')
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
                onClick={handleUpgrade}
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
              >
                Fazer Upgrade - €19/mês
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Plano Atual
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

    </div>
  )
} 