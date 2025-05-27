export interface HookdeckWebhook {
  webhookUrl: string;
  destination: {
    id: string;
    name: string;
    url: string;
  };
  source: {
    id: string;
    name: string;
    slug: string;
    url: string;
  };
  connection: {
    id: string;
    source_id: string;
    destination_id: string;
  };
}

class HookdeckService {
  private baseUrl = '/api';

  async createWebhook(webhookType: 'registrations' | 'payments'): Promise<HookdeckWebhook> {
    console.log(`[Hookdeck] Creating ${webhookType} webhook...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create webhook: ${errorData.error} - ${errorData.details || ''}`);
      }

      const data = await response.json();
      console.log(`[Hookdeck] ${webhookType} webhook created successfully:`, data);
      
      return {
        webhookUrl: data.webhookUrl,
        destination: data.destination,
        source: data.source,
        connection: data.connection
      };
    } catch (error) {
      console.error(`[Hookdeck] Error creating ${webhookType} webhook:`, error);
      throw error;
    }
  }

  async deleteWebhook(webhook: HookdeckWebhook): Promise<void> {
    console.log('[Hookdeck] Deleting webhook...', webhook);
    
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/cleanup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: webhook.connection.id,
          sourceId: webhook.source.id,
          destinationId: webhook.destination.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete webhook: ${errorData.error} - ${errorData.details || ''}`);
      }

      const data = await response.json();
      console.log('[Hookdeck] Webhook deleted successfully:', data);
    } catch (error) {
      console.error('[Hookdeck] Error deleting webhook:', error);
      throw error;
    }
  }
}

export const hookdeckService = new HookdeckService(); 