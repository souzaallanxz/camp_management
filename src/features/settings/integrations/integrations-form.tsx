import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { IconCreditCard, IconCheck, IconLoader2, IconBrandStripe } from '@tabler/icons-react'
import { integrationsService } from '../services/integrations-service'
import { WebhookIntegrationCard } from '@/features/integrations/components/webhook-integration-card'

const mbwayIntegrationSchema = z.object({
  mbway_key: z.string().min(1, 'A chave MBWay é obrigatória'),
  is_active: z.boolean(),
})

const stripeIntegrationSchema = z.object({
  publishable_key: z.string().min(1, 'A chave pública é obrigatória'),
  secret_key: z.string().min(1, 'A chave secreta é obrigatória'),
  is_active: z.boolean(),
})

type MBWayIntegrationForm = z.infer<typeof mbwayIntegrationSchema>
type StripeIntegrationForm = z.infer<typeof stripeIntegrationSchema>

interface MBWayIntegration {
  id?: string
  mbway_key: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface StripeIntegration {
  id?: string
  publishable_key: string
  secret_key: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function IntegrationsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mbwayIntegration, setMbwayIntegration] = useState<MBWayIntegration | null>(null)
  const [stripeIntegration, setStripeIntegration] = useState<StripeIntegration | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MBWayIntegrationForm>({
    resolver: zodResolver(mbwayIntegrationSchema),
    defaultValues: {
      mbway_key: '',
      is_active: false,
    },
  })

  const {
    register: registerStripe,
    handleSubmit: handleSubmitStripe,
    setValue: setValueStripe,
    watch: watchStripe,
    formState: { errors: errorsStripe },
  } = useForm<StripeIntegrationForm>({
    resolver: zodResolver(stripeIntegrationSchema),
    defaultValues: {
      publishable_key: '',
      secret_key: '',
      is_active: false,
    },
  })

  const isActive = watch('is_active')
  const isStripeActive = watchStripe('is_active')

  useEffect(() => {
    loadMBWayIntegration()
    loadStripeIntegration()
  }, [])

  const loadMBWayIntegration = async () => {
    try {
      setIsLoading(true)
      const integration = await integrationsService.getMBWayIntegration()
      if (integration) {
        setMbwayIntegration(integration)
        setValue('mbway_key', integration.mbway_key)
        setValue('is_active', integration.is_active)
      }
    } catch (error) {
      console.error('Erro ao carregar integração MBWay:', error)
      toast.error('Erro ao carregar configurações da integração MBWay')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStripeIntegration = async () => {
    try {
      setIsLoading(true)
      const integration = await integrationsService.getStripeIntegration()
      if (integration) {
        setStripeIntegration(integration)
        setValueStripe('publishable_key', integration.publishable_key)
        setValueStripe('secret_key', integration.secret_key)
        setValueStripe('is_active', integration.is_active)
      }
    } catch (error) {
      console.error('Erro ao carregar integração Stripe:', error)
      toast.error('Erro ao carregar configurações da integração Stripe')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: MBWayIntegrationForm) => {
    try {
      setIsSaving(true)
      
      if (mbwayIntegration?.id) {
        await integrationsService.updateMBWayIntegration(mbwayIntegration.id, data)
        toast.success('Integração MBWay atualizada com sucesso')
      } else {
        const newIntegration = await integrationsService.createMBWayIntegration(data)
        setMbwayIntegration(newIntegration)
        toast.success('Integração MBWay criada com sucesso')
      }
      
      await loadMBWayIntegration()
    } catch (error) {
      console.error('Erro ao salvar integração MBWay:', error)
      toast.error('Erro ao salvar configurações da integração MBWay')
    } finally {
      setIsSaving(false)
    }
  }

  const onSubmitStripe = async (data: StripeIntegrationForm) => {
    try {
      setIsSaving(true)
      
      if (stripeIntegration?.id) {
        await integrationsService.updateStripeIntegration(stripeIntegration.id, data)
        toast.success('Integração Stripe atualizada com sucesso')
      } else {
        const newIntegration = await integrationsService.createStripeIntegration(data)
        setStripeIntegration(newIntegration)
        toast.success('Integração Stripe criada com sucesso')
      }
      
      await loadStripeIntegration()
    } catch (error) {
      console.error('Erro ao salvar integração Stripe:', error)
      toast.error('Erro ao salvar configurações da integração Stripe')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full items-stretch">
        {/* MBWay Integration Card */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <IconCreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">MBWay com IfthenPay</CardTitle>
                  <CardDescription className="text-xs">
                    Configure a sua chave MBWay para processar pagamentos via MBWay
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="mbway-active" className="text-sm font-medium">
                  {isActive ? 'Ativo' : 'Inativo'}
                </Label>
                <Switch
                  id="mbway-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            <div className="flex-1">
              <Alert className="py-2">
                <IconCreditCard className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Esta integração permite processar pagamentos MBWay através da plataforma IfthenPay. 
                  Certifique-se de que tem uma conta ativa no IfthenPay e uma chave MBWay válida.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="mbway-key">Chave MBWay</Label>
                  <Input
                    id="mbway-key"
                    type="password"
                    placeholder="Insira a sua chave MBWay do IfthenPay"
                    {...register('mbway_key')}
                    disabled={isLoading}
                  />
                  {errors.mbway_key && (
                    <p className="text-sm text-red-500">{errors.mbway_key.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadMBWayIntegration}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving || isLoading}
              >
                {isSaving ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconCheck className="mr-2 h-4 w-4" />
                )}
                {mbwayIntegration?.id ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Integration Card */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <IconBrandStripe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Stripe</CardTitle>
                  <CardDescription className="text-xs">
                    Configure as suas chaves Stripe para processar pagamentos com cartão
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="stripe-active" className="text-sm font-medium">
                  {isStripeActive ? 'Ativo' : 'Inativo'}
                </Label>
                <Switch
                  id="stripe-active"
                  checked={isStripeActive}
                  onCheckedChange={(checked) => setValueStripe('is_active', checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            <div className="flex-1">
              <Alert className="py-2">
                <IconBrandStripe className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Esta integração permite processar pagamentos com cartão através da plataforma Stripe. 
                  Certifique-se de que tem uma conta ativa no Stripe e as chaves corretas.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="stripe-publishable-key">Chave Pública (Publishable Key)</Label>
                  <Input
                    id="stripe-publishable-key"
                    type="text"
                    placeholder="pk_test_... ou pk_live_..."
                    {...registerStripe('publishable_key')}
                    disabled={isLoading}
                  />
                  {errorsStripe.publishable_key && (
                    <p className="text-sm text-red-500">{errorsStripe.publishable_key.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-secret-key">Chave Secreta (Secret Key)</Label>
                  <Input
                    id="stripe-secret-key"
                    type="password"
                    placeholder="sk_test_... ou sk_live_..."
                    {...registerStripe('secret_key')}
                    disabled={isLoading}
                  />
                  {errorsStripe.secret_key && (
                    <p className="text-sm text-red-500">{errorsStripe.secret_key.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadStripeIntegration}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitStripe(onSubmitStripe)}
                disabled={isSaving || isLoading}
              >
                {isSaving ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconCheck className="mr-2 h-4 w-4" />
                )}
                {stripeIntegration?.id ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Integration Card */}
        <WebhookIntegrationCard />
      </div>
    </div>
  )
} 