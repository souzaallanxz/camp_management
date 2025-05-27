interface HookdeckDestination {
  id: string
  name: string
  url: string
}

interface HookdeckSource {
  id: string
  name: string
  slug: string
  url: string
}

interface HookdeckConnection {
  id: string
  source_id: string
  destination_id: string
}

interface CreateDestinationRequest {
  name: string
  url: string
}

interface CreateSourceRequest {
  name: string
  slug: string
}

interface CreateConnectionRequest {
  source_id: string
  destination_id: string
}

export class HookdeckService {
  private readonly API_BASE_URL = 'https://api.hookdeck.com'
  // For frontend, we'll use a placeholder or get from config
  // In production, this should be handled by your backend
  private readonly API_KEY = 'your-hookdeck-api-key'

  private debug(message: string, data?: unknown) {
    // Always log in development for debugging
    // eslint-disable-next-line no-console
    console.log(`[HookdeckService] ${message}`, data || '')
  }

  private debugError(message: string, error?: unknown) {
    // Always log errors for debugging
    // eslint-disable-next-line no-console
    console.error(`[HookdeckService] ${message}`, error || '')
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: CreateDestinationRequest | CreateSourceRequest | CreateConnectionRequest
  ): Promise<T> {
    // For now, we'll simulate the Hookdeck API calls
    // In production, these calls should be made from your backend
    return this.simulateHookdeckAPI(endpoint, method, body)
  }

  private async simulateHookdeckAPI<T>(
    endpoint: string,
    method: string,
    body?: CreateDestinationRequest | CreateSourceRequest | CreateConnectionRequest
  ): Promise<T> {
    // Simulate API delay (reduced for faster testing)
    await new Promise(resolve => setTimeout(resolve, 500))

    if (endpoint === '/destinations' && method === 'POST') {
      return {
        id: 'dest_' + Math.random().toString(36).substring(2, 15),
        name: (body as CreateDestinationRequest).name,
        url: (body as CreateDestinationRequest).url
      } as T
    }

    if (endpoint === '/sources' && method === 'POST') {
      const sourceBody = body as CreateSourceRequest
      const slug = sourceBody.slug || Math.random().toString(36).substring(2, 15)
      return {
        id: 'src_' + Math.random().toString(36).substring(2, 15),
        name: sourceBody.name,
        slug: slug,
        url: `https://hkdk.events/${slug}`
      } as T
    }

    if (endpoint === '/connections' && method === 'POST') {
      const connectionBody = body as CreateConnectionRequest
      return {
        id: 'conn_' + Math.random().toString(36).substring(2, 15),
        source_id: connectionBody.source_id,
        destination_id: connectionBody.destination_id
      } as T
    }

    // For delete operations, just return success
    if (method === 'DELETE') {
      return {} as T
    }

    throw new Error(`Unsupported API call: ${method} ${endpoint}`)
  }

  async createDestination(userId: string, webhookType: 'registrations' | 'payments'): Promise<HookdeckDestination> {
    const destinationData: CreateDestinationRequest = {
      name: `Webhook ${webhookType} para User ${userId}`,
      url: `${window.location.origin}/api/webhooks/${webhookType}/${userId}`
    }

    return this.makeRequest<HookdeckDestination>('/destinations', 'POST', destinationData)
  }

  async createSource(userId: string, webhookType: 'registrations' | 'payments'): Promise<HookdeckSource> {
    const sourceData: CreateSourceRequest = {
      name: `${webhookType} do User ${userId}`,
      slug: `${webhookType}-user-${userId}`
    }

    return this.makeRequest<HookdeckSource>('/sources', 'POST', sourceData)
  }

  async createConnection(sourceId: string, destinationId: string): Promise<HookdeckConnection> {
    const connectionData: CreateConnectionRequest = {
      source_id: sourceId,
      destination_id: destinationId
    }

    return this.makeRequest<HookdeckConnection>('/connections', 'POST', connectionData)
  }

  // Configurar webhook no Hookdeck via backend
  async setupWebhook(webhookType: 'registrations' | 'payments'): Promise<{
    webhookUrl: string
    connection: {
      id: string
    }
    source: {
      id: string
    }
    destination: {
      id: string
    }
  }> {
    try {
      const response = await fetch('/api/webhooks/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookType }),
      })

      if (!response.ok) {
        throw new Error('Failed to setup webhook')
      }

      const result = await response.json()
      this.debug('Webhook setup result:', result)
      return result
    } catch (error) {
      this.debugError('Error setting up webhook:', error)
      throw error
    }
  }

  // Remover webhook do Hookdeck via backend
  async cleanupWebhook(
    connectionId: string,
    sourceId: string,
    destinationId: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/webhooks/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          sourceId,
          destinationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to cleanup webhook')
      }

      this.debug('Webhook cleanup successful')
    } catch (error) {
      this.debugError('Error cleaning up webhook:', error)
      throw error
    }
  }
}

export const hookdeckService = new HookdeckService() 