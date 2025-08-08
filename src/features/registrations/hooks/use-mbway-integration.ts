import { useState, useEffect } from 'react'
import { integrationsService } from '@/features/settings/services/integrations-service'

interface MBWayIntegration {
  id: string
  mbway_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useMBWayIntegration() {
  const [integration, setIntegration] = useState<MBWayIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadIntegration() {
      try {
        setLoading(true)
        setError(null)
        
        const data = await integrationsService.getMBWayIntegration()
        setIntegration(data)
      } catch (err) {
        // If integration not found, that's okay - just means it's not configured
        if (err instanceof Error && err.message.includes('404')) {
          setIntegration(null)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load MBWay integration')
        }
      } finally {
        setLoading(false)
      }
    }

    loadIntegration()
  }, [])

  const isActive = integration?.is_active ?? false
  const isConfigured = integration !== null

  return {
    integration,
    isActive,
    isConfigured,
    loading,
    error
  }
} 