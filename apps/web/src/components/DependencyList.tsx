import { useState } from 'react'
import type { Flag, Dependency } from '@repo/types'

interface DependencyListProps {
  flagId: string
  allFlags: Flag[]
  dependencies: Dependency[]
  onAdd: (type: 'requires' | 'excludes', dependsOn: string) => Promise<void>
  onRemove: (depId: string) => Promise<void>
}

export default function DependencyList({
  flagId,
  allFlags,
  dependencies,
  onAdd,
  onRemove,
}: DependencyListProps) {
  const [selectedType, setSelectedType] = useState<'requires' | 'excludes'>('requires')
  const [selectedFlag, setSelectedFlag] = useState('')
  const [loading, setLoading] = useState(false)

  const relevantDeps = dependencies.filter(d => d.flagId === flagId)
  const otherFlags = allFlags.filter(f => f.id !== flagId)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFlag) return

    setLoading(true)
    try {
      await onAdd(selectedType, selectedFlag)
      setSelectedFlag('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Dependencies</h3>

      {/* Add dependency form */}
      <form onSubmit={handleAdd} className="card space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as 'requires' | 'excludes')}
              disabled={loading}
              className="input-base"
            >
              <option value="requires">Requires</option>
              <option value="excludes">Excludes</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Flag</label>
            <select
              value={selectedFlag}
              onChange={e => setSelectedFlag(e.target.value)}
              disabled={loading}
              className="input-base"
            >
              <option value="">Select a flag...</option>
              {otherFlags.map(flag => (
                <option key={flag.id} value={flag.id}>
                  {flag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={!selectedFlag || loading}
          className="btn-primary w-full"
        >
          {loading ? 'Adding...' : 'Add Dependency'}
        </button>
      </form>

      {/* Dependencies list */}
      {relevantDeps.length === 0 ? (
        <p className="text-slate-400 text-sm">No dependencies</p>
      ) : (
        <div className="space-y-2">
          {relevantDeps.map(dep => {
            const depFlag = allFlags.find(f => f.id === dep.dependsOn)
            return (
              <div key={dep.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{depFlag?.name}</p>
                  <p className="text-xs text-slate-400">
                    {dep.type === 'requires' ? 'This flag requires' : 'This flag excludes'} it
                  </p>
                </div>
                <button
                  onClick={() => onRemove(dep.id)}
                  className="btn-ghost"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
