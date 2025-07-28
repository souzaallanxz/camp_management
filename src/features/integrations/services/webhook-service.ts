import { api } from '@/lib/api-client'

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
    // Debug logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
    }
  }

  private debugError(message: string, error: unknown) {
    // Error logging only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[WebhookService] ${message}`, error)
    }
  }

  private generateApiKey(): string {
    return `wh_${Math.random().toString(36).substring(2, 15)}`
  }

  // Load configuration from backend
  async loadConfig(): Promise<WebhookConfig> {
    try {
      const response = await api.get('/webhooks/config')
      const config = response.data
      
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

  // Save configuration to backend
  async saveConfig(config: WebhookConfig): Promise<void> {
    try {
      await api.post('/webhooks/config', config)
    } catch (error) {
      this.debugError('Error saving webhook config:', error)
      throw error
    }
  }

  // Enable webhook
  async enableWebhook(webhookType: 'registrations' | 'payments'): Promise<WebhookConfig> {
    this.debug(`Starting webhook activation for ${webhookType}`)
    const config = await this.loadConfig()
    this.debug('Current configuration:', config)
    
    try {
      // Setup in Hookdeck via backend
      const response = await api.post('/webhooks/setup', { webhookType })
      const result = response.data
      this.debug('Hookdeck result:', result)
      
      // Map type to correct property name
      const webhookPropName = webhookType === 'registrations' ? 'registrationWebhook' : 'paymentWebhook'
      const webhookUrlPropName = webhookType === 'registrations' ? 'registrationWebhookUrl' : 'paymentWebhookUrl'
      
      // Update configuration
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
      
      this.debug('Updated configuration:', updatedConfig)
      await this.saveConfig(updatedConfig)
      this.debug('Configuration saved successfully')
      return updatedConfig
    } catch (error) {
      this.debugError('Error enabling webhook:', error)
      throw new Error(`Failed to enable webhook ${webhookType}: ${error}`)
    }
  }

  // Disable webhook
  async disableWebhook(webhookType: 'registrations' | 'payments'): Promise<WebhookConfig> {
    this.debug(`Starting webhook deactivation for ${webhookType}`)
    const config = await this.loadConfig()
    
    // Debug: verificar se há dados do webhook
    this.debug(`Webhook data for ${webhookType}:`, config.hookdeckData[webhookType])
    
    try {
      // Cleanup in Hookdeck via backend
      const webhookData = config.hookdeckData[webhookType]
      if (webhookData) {
        await api.delete('/webhooks/cleanup', {
          data: {
            connectionId: webhookData.connectionId,
            sourceId: webhookData.sourceId,
            destinationId: webhookData.destinationId,
            webhookType: webhookType
          }
        })
      }
      
      // Map type to correct property name
      const webhookPropName = webhookType === 'registrations' ? 'registrationWebhook' : 'paymentWebhook'
      const webhookUrlPropName = webhookType === 'registrations' ? 'registrationWebhookUrl' : 'paymentWebhookUrl'
      
      // Update configuration
      const updatedConfig: WebhookConfig = {
        ...config,
        [webhookPropName]: false,
        [webhookUrlPropName]: '',
        hookdeckData: {
          ...config.hookdeckData,
          [webhookType]: undefined
        }
      }
      
      // Check if any webhooks are still active
      const hasActiveWebhooks = updatedConfig.registrationWebhook || updatedConfig.paymentWebhook
      updatedConfig.isConnected = hasActiveWebhooks
      
      await this.saveConfig(updatedConfig)
      this.debug(`Webhook ${webhookType} disabled successfully. isConnected: ${updatedConfig.isConnected}`)
      return updatedConfig
    } catch (error) {
      this.debugError('Error disabling webhook:', error)
      throw new Error(`Failed to disable webhook ${webhookType}: ${error}`)
    }
  }

  // Get active endpoints
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