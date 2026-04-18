import type { Dependency, Environment, Flag } from '@repo/types'
import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'

interface UseFlagsState {
  flags: Flag[]
  dependencies: Dependency[]
  loading: boolean
  error: Error | null
  environment: Environment
  toggleLoading: Record<string, boolean>
}

export function useFlags() {
  const [state, setState] = useState<UseFlagsState>({
    flags: [],
    dependencies: [],
    loading: false,
    error: null,
    environment: 'dev',
    toggleLoading: {},
  })

  // Initial load
  useEffect(() => {
    const load = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [flags, dependencies] = await Promise.all([
          apiClient.getFlags(),
          apiClient.getDependencies(),
        ])
        setState(prev => ({
          ...prev,
          flags,
          dependencies,
          loading: false,
        }))
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err : new Error('Unknown error'),
          loading: false,
        }))
      }
    }
    load()
  }, [])

  const setEnvironment = useCallback((env: Environment) => {
    setState(prev => ({ ...prev, environment: env }))
  }, [])

  const addFlag = useCallback(async (name: string, description?: string) => {
    try {
      const flag = await apiClient.createFlag({ name, description })
      setState(prev => ({
        ...prev,
        flags: [...prev.flags, flag],
      }))
      return flag
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to create flag'),
      }))
      throw err
    }
  }, [])

  const updateFlag = useCallback(async (id: string, name: string, description: string) => {
    try {
      const updated = await apiClient.updateFlag(id, { name, description })
      setState(prev => ({
        ...prev,
        flags: prev.flags.map(f => f.id === id ? updated : f),
      }))
      return updated
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to update flag'),
      }))
      throw err
    }
  }, [])

  const toggleFlag = useCallback(async (id: string, enabled: boolean) => {
    try {
      // Set loading state for this flag
      setState(prev => ({
        ...prev,
        toggleLoading: { ...prev.toggleLoading, [id]: true },
      }))

      const result = await apiClient.toggleFlag(id, state.environment, enabled)
      console.log('toggleFlag API response:', result)

      // If result has 'valid' property, it's a validation error response
      if ('valid' in result && !result.valid) {
        // Return the error result, don't update flags
        console.log('Validation error returned from API:', result)
        setState(prev => ({
          ...prev,
          toggleLoading: { ...prev.toggleLoading, [id]: false },
        }))
        return result
      }

      // Success - update the flag state
      setState(prev => ({
        ...prev,
        flags: prev.flags.map(f =>
          f.id === id
            ? {
                ...f,
                states: {
                  ...f.states,
                  [state.environment]: enabled,
                },
              }
            : f
        ),
        toggleLoading: { ...prev.toggleLoading, [id]: false },
      }))

      return { valid: true }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to toggle flag'),
        toggleLoading: { ...prev.toggleLoading, [id]: false },
      }))
      throw err
    }
  }, [state.environment])

  const addDependency = useCallback(async (flagId: string, type: 'requires' | 'excludes', dependsOn: string) => {
    try {
      const dep = await apiClient.createDependency({ flagId, type, dependsOn })
      setState(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, dep],
      }))
      return dep
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to add dependency'),
      }))
      throw err
    }
  }, [])

  const removeDependency = useCallback(async (id: string) => {
    try {
      await apiClient.deleteDependency(id)
      setState(prev => ({
        ...prev,
        dependencies: prev.dependencies.filter(d => d.id !== id),
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to remove dependency'),
      }))
      throw err
    }
  }, [])

  return {
    ...state,
    setEnvironment,
    addFlag,
    updateFlag,
    toggleFlag,
    addDependency,
    removeDependency,
  }
}
