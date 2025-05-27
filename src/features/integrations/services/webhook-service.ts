import { getTeamIdHeader } from '@/lib/auth'

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface WebhookConfig {
  apiKey: string
  registrationWebhook: boolean
  paymentWebhook: boolean
  isConnected: boolean
  registrationWebhookUrl: string
  paymentWebhookUrl: string
  hookdeckData: {
    registrations?: {
      connectionId: string
      sourceId: string
      destinationId: string
    }
    payments?: {
      connectionId: string
      sourceId: string
      destinationId: string
    }
  }
}

export interface WebhookEndpoint {
  type: 'registrations' | 'payments'
  url: string
  enabled: boolean
  hookdeckUrl: string
}

class WebhookService {
  private debug(message: string, data?: unknown) {
    // Always log in development for debugging
    // eslint-disable-next-line no-console
    console.log(`[WebhookService] ${message}`, data || '')
  }

  private debugError(message: string, error?: unknown) {
    // Always log errors for debugging
    // eslint-disable-next-line no-console
    console.error(`[WebhookService] ${message}`, error || '')
  }

  // Carregar configuração do backend
  async loadConfig(): Promise<WebhookConfig> {
    try {
      const headers = { ...getTeamIdHeader() }
      const response = await fetch(`${API_BASE_URL}/webhooks/config`, {
        headers,
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to load webhook config')
      }
      const config = await response.json()
      
      // If no config exists yet, return default state
      if (!config || !Array.isArray(config) || config.length === 0) {
        return {
          apiKey: this.generateApiKey(),
          registrationWebhook: false,
          paymentWebhook: false,
          isConnected: false,
          registrationWebhookUrl: '',
          paymentWebhookUrl: '',
          hookdeckData: {}
        }
      }

      // Get first config since we only support one per team
      const currentConfig = config[0]
      
      return {
        apiKey: currentConfig.apiKey || this.generateApiKey(),
        registrationWebhook: currentConfig.registration_webhook || false,
        paymentWebhook: currentConfig.payment_webhook || false,
        isConnected: currentConfig.is_connected || false,
        registrationWebhookUrl: currentConfig.registration_webhook_url || '',
        paymentWebhookUrl: currentConfig.payment_webhook_url || '',
        hookdeckData: currentConfig.hookdeck_data || {}
      }
    } catch (error) {
      this.debugError('Error loading webhook config:', error)
      throw error
    }
  }

  // Salvar configuração no backend
  async saveConfig(config: WebhookConfig): Promise<void> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json'
      }
      const response = await fetch(`${API_BASE_URL}/webhooks/config`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(config),
      })
      if (!response.ok) {
        throw new Error('Failed to save webhook config')
      }
    } catch (error) {
      this.debugError('Error saving webhook config:', error)
      throw error
    }
  }

  // Gerar nova API Key
  generateApiKey(): string {
    return `sk_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`
  }

  // Validar configuração
  validateConfig(config: WebhookConfig): string[] {
    const errors: string[] = []
    if (!config.apiKey) {
      errors.push('API Key is required')
    }
    return errors
  }

  // Ativar webhook
  async enableWebhook(webhookType: 'registrations' | 'payments'): Promise<WebhookConfig> {
    this.debug(`Iniciando ativação do webhook ${webhookType}`)
    const config = await this.loadConfig()
    this.debug('Configuração atual:', config)
    
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json'
      }
      
      // Configurar no Hookdeck via backend
      const response = await fetch(`${API_BASE_URL}/webhooks/setup`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ webhookType }),
      })

      if (!response.ok) {
        throw new Error('Failed to setup webhook')
      }

      const result = await response.json()
      this.debug('Resultado do Hookdeck:', result)
      
      // Mapear o tipo para o nome correto da propriedade
      const webhookPropName = webhookType === 'registrations' ? 'registrationWebhook' : 'paymentWebhook'
      const webhookUrlPropName = webhookType === 'registrations' ? 'registrationWebhookUrl' : 'paymentWebhookUrl'
      
      // Atualizar configuração
      const updatedConfig: WebhookConfig = {
        ...config,
        [webhookPropName]: true,
        [webhookUrlPropName]: result.webhookUrl,
        hookdeckData: {
          ...config.hookdeckData,
          [webhookType]: {
            connectionId: result.connection.id,
            sourceId: result.source.id,
            destinationId: result.destination.id
          }
        },
        isConnected: true
      }
      
      this.debug('Configuração atualizada:', updatedConfig)
      await this.saveConfig(updatedConfig)
      this.debug('Configuração salva com sucesso')
      return updatedConfig
    } catch (error) {
      this.debugError('Erro ao ativar webhook:', error)
      throw new Error(`Falha ao ativar webhook ${webhookType}: ${error}`)
    }
  }

  // Desativar webhook
  async disableWebhook(webhookType: 'registrations' | 'payments'): Promise<WebhookConfig> {
    const config = await this.loadConfig()
    
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json'
      }
      
      // Remover do Hookdeck se existir
      const hookdeckData = config.hookdeckData?.[webhookType]
      if (hookdeckData) {
        const response = await fetch(`${API_BASE_URL}/webhooks/cleanup`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            connectionId: hookdeckData.connectionId,
            sourceId: hookdeckData.sourceId,
            destinationId: hookdeckData.destinationId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to cleanup webhook')
        }
      }
      
      // Mapear o tipo para o nome correto da propriedade
      const webhookPropName = webhookType === 'registrations' ? 'registrationWebhook' : 'paymentWebhook'
      const webhookUrlPropName = webhookType === 'registrations' ? 'registrationWebhookUrl' : 'paymentWebhookUrl'
      
      // Atualizar configuração
      const updatedConfig: WebhookConfig = {
        ...config,
        [webhookPropName]: false,
        [webhookUrlPropName]: '',
        hookdeckData: {
          ...config.hookdeckData,
          [webhookType]: {}
        }
      }
      
      // Verificar se ainda há webhooks ativos
      updatedConfig.isConnected = updatedConfig.registrationWebhook || updatedConfig.paymentWebhook
      
      await this.saveConfig(updatedConfig)
      return updatedConfig
    } catch (error) {
      throw new Error(`Falha ao desativar webhook ${webhookType}: ${error}`)
    }
  }

  // Obter endpoints ativos
  getActiveEndpoints(config: WebhookConfig): WebhookEndpoint[] {
    const endpoints: WebhookEndpoint[] = []

    if (config.registrationWebhook) {
      endpoints.push({
        type: 'registrations',
        url: '/webhook/registrations',
        enabled: true,
        hookdeckUrl: config.registrationWebhookUrl
      })
    }

    if (config.paymentWebhook) {
      endpoints.push({
        type: 'payments',
        url: '/webhook/payments',
        enabled: true,
        hookdeckUrl: config.paymentWebhookUrl
      })
    }

    return endpoints
  }
}

export const webhookService = new WebhookService() 