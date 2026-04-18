import type { Dependency, Environment, Flag, GraphSnapshot, ValidationResult } from '@repo/types'

const API_BASE = 'http://localhost:3001'

export const apiClient = {
  // Flags
  async getFlags(): Promise<Flag[]> {
    const res = await fetch(`${API_BASE}/flags`)
    if (!res.ok) throw new Error('Failed to fetch flags')
    return res.json()
  },

  async getFlagById(id: string): Promise<Flag> {
    const res = await fetch(`${API_BASE}/flags/${id}`)
    if (!res.ok) throw new Error('Failed to fetch flag')
    return res.json()
  },

  async createFlag(data: { name: string; description?: string }): Promise<Flag> {
    const res = await fetch(`${API_BASE}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create flag')
    return res.json()
  },

  async updateFlag(id: string, data: { name?: string; description?: string }): Promise<Flag> {
    const res = await fetch(`${API_BASE}/flags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update flag')
    return res.json()
  },

  async deleteFlag(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/flags/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete flag')
  },

  async toggleFlag(id: string, environment: Environment, enabled: boolean): Promise<{ valid: boolean } | ValidationResult> {
    const res = await fetch(`${API_BASE}/flags/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment, enabled }),
    })
    const data = await res.json()
    if (!res.ok && res.status !== 409) throw new Error('Failed to toggle flag')
    return data
  },

  // Dependencies
  async getDependencies(): Promise<Dependency[]> {
    const res = await fetch(`${API_BASE}/dependencies`)
    if (!res.ok) throw new Error('Failed to fetch dependencies')
    return res.json()
  },

  async createDependency(data: { flagId: string; type: 'requires' | 'excludes'; dependsOn: string }): Promise<Dependency> {
    const res = await fetch(`${API_BASE}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(responseData.error || responseData.detail || 'Failed to create dependency')
    }
    return responseData
  },

  async deleteDependency(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/dependencies/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete dependency')
  },

  // Graph
  async getGraphSnapshot(environment: Environment): Promise<GraphSnapshot> {
    const res = await fetch(`${API_BASE}/graph?environment=${environment}`)
    if (!res.ok) throw new Error('Failed to fetch graph')
    return res.json()
  },
}
