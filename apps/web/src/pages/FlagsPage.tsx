import type { SuggestedAction, ValidationResult } from '@repo/types'
import { useState } from 'react'
import ConflictModal from '../components/ConflictModal'
import EnvSwitcher from '../components/EnvSwitcher'
import FlagCard from '../components/FlagCard'
import FlagForm from '../components/FlagForm'
import { useFlags } from '../hooks/useFlags'

export default function FlagsPage() {
  const {
    flags,
    dependencies,
    environment,
    setEnvironment,
    addFlag,
    toggleFlag,
    loading,
    error,
    toggleLoading,
  } = useFlags()

  const [showForm, setShowForm] = useState(false)
  const [conflict, setConflict] = useState<ValidationResult | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{ flagId: string; enabled: boolean } | null>(null)

  console.log(error)

  const handleToggleFlag = async (flagId: string, enabled: boolean) => {
    const result = await toggleFlag(flagId, enabled)

    console.log('Toggle result:', result)

    if ('valid' in result && !result.valid) {
      console.log('Conflict detected, setting state:', { result, flagId, enabled })
      setConflict(result)
      setPendingToggle({ flagId, enabled })
    }
  }

  const handleResolveConflict = async (actions: SuggestedAction[]) => {
    if (!pendingToggle) return

    // Execute each suggested action
    for (const action of actions) {
      await toggleFlag(action.flagId, action.action === 'enable')
    }

    // Then enable the original flag
    await toggleFlag(pendingToggle.flagId, pendingToggle.enabled)
    setConflict(null)
    setPendingToggle(null)
  }

  const allFlagsMap = new Map(flags.map(f => [f.id, f]))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
          <p className="text-slate-400">Manage flags across dev, staging, and prod</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          + New Flag
        </button>
      </div>

      {/* Environment Switcher */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Environment</p>
        <EnvSwitcher current={environment} onChange={setEnvironment} />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card max-w-md">
          <FlagForm
            onSubmit={async (name, desc) => {
              await addFlag(name, desc)
              setShowForm(false)
            }}
            submitLabel="Create"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">
          {error.message}
        </div>
      )}

      {/* Flags Grid */}
      {loading ? (
        <div className="text-center text-slate-400">Loading flags...</div>
      ) : flags.length === 0 ? (
        <div className="text-center text-slate-400 py-12">No flags yet. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flags.map(flag => (
            <FlagCard
              key={flag.id}
              flag={flag}
              environment={environment}
              dependencyCount={dependencies.filter(d => d.flagId === flag.id).length}
              onToggle={(enabled) => handleToggleFlag(flag.id, enabled)}
              onToggleLoading={toggleLoading[flag.id]}
            />
          ))}
        </div>
      )}

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={conflict !== null}
        validation={conflict}
        allFlags={allFlagsMap}
        flagId={pendingToggle?.flagId || null}
        flagName={allFlagsMap.get(pendingToggle?.flagId || '')?.name || null}
        onResolve={handleResolveConflict}
        onCancel={() => {
          setConflict(null)
          setPendingToggle(null)
        }}
      />
    </div>
  )
}
