import { useCallback, useEffect, useState } from 'react'
import { Registration } from '../data/schema'
import { getRegistrations } from '../services/registration-service'

export function useRegistrations() {
  const [data, setData] = useState<Registration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true)
      const registrations = await getRegistrations()
      setData(registrations)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch registrations'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  return { data, isLoading, error, refetch: fetchRegistrations }
} 