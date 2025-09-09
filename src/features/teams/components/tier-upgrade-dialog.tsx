import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconCrown, IconCheck, IconX } from '@tabler/icons-react'

interface TierUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const tiers = [
  {
    name: 'Free',
    price: '€0',
    description: 'Plano básico para começar',
    features: [
      'Até 50 campistas',
      'Gestão básica de staff',
      'Relatórios básicos',
      'Suporte por email'
    ],
    limitations: [
      'Sem integrações avançadas',
      'Relatórios limitados',
      'Sem funcionalidades premium'
    ]
  },
  {
    name: 'Pro',
    price: '€29',
    description: 'Ideal para campos de tamanho médio',
    features: [
      'Até 200 campistas',
      'Gestão completa de staff',
      'Relatórios avançados',
      'Integrações com webhooks',
      'Suporte prioritário',
      'Funcionalidades premium'
    ],
    limitations: []
  },
  {
    name: 'Enterprise',
    price: '€99',
    description: 'Para campos grandes e organizações',
    features: [
      'Campistas ilimitados',
      'Gestão avançada de staff',
      'Relatórios personalizados',
      'Integrações completas',
      'Suporte dedicado',
      'Funcionalidades enterprise',
      'API personalizada'
    ],
    limitations: []
  }
]

export function TierUpgradeDialog({ open, onOpenChange }: TierUpgradeDialogProps) {
  const handleUpgrade = (tier: string) => {
    // TODO: Implement upgrade logic
    console.log(`Upgrading to ${tier} tier`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCrown className="h-5 w-5 text-yellow-500" />
            Upgrade do Plano
          </DialogTitle>
          <DialogDescription>
            Escolha o plano que melhor se adapta às suas necessidades. 
            Todos os planos incluem atualizações gratuitas e suporte.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {tiers.map((tier, index) => (
            <Card key={tier.name} className={`relative ${index === 1 ? 'border-primary shadow-lg scale-105' : ''}`}>
              {index === 1 && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Recomendado
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {tier.name}
                  <span className="text-2xl font-bold">{tier.price}</span>
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Incluído:</h4>
                  <ul className="space-y-1">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm">
                        <IconCheck className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.limitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Limitações:</h4>
                    <ul className="space-y-1">
                      {tier.limitations.map((limitation, limitationIndex) => (
                        <li key={limitationIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IconX className="h-4 w-4 text-red-500" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  variant={index === 1 ? "default" : "outline"}
                  onClick={() => handleUpgrade(tier.name)}
                >
                  {index === 0 ? 'Plano Atual' : `Upgrade para ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Perguntas Frequentes</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Posso mudar de plano a qualquer momento?</strong> Sim, pode fazer upgrade ou downgrade a qualquer momento.</p>
            <p><strong>Há período de teste?</strong> Oferecemos 14 dias de teste gratuito para todos os planos pagos.</p>
            <p><strong>Como funciona o suporte?</strong> O suporte varia conforme o plano, desde email até suporte dedicado.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 