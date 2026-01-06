import { useState, useCallback } from 'react'
import type { AIDefaultsRequest, AIDefaultsResponse } from '@/types/ai-defaults'

interface UseAIDefaultsResult {
  defaults: AIDefaultsResponse | null
  loading: boolean
  error: string | null
  fetchDefaults: (request: AIDefaultsRequest) => Promise<void>
}

/**
 * Hook for fetching AI-generated default suggestions
 */
export function useAIDefaults(): UseAIDefaultsResult {
  const [defaults, setDefaults] = useState<AIDefaultsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDefaults = useCallback(async (request: AIDefaultsRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch AI defaults')
      }

      const data: AIDefaultsResponse = await response.json()
      setDefaults(data)
      console.log('[useAIDefaults] Fetched defaults:', data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useAIDefaults] Error:', errorMessage)
      setError(errorMessage)
      setDefaults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return { defaults, loading, error, fetchDefaults }
}
