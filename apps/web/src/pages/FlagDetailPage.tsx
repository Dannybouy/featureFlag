import type { Flag } from '@repo/types'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CycleModal from '../components/CycleModal'
import DependencyList from '../components/DependencyList'
import FlagForm from '../components/FlagForm'
import { useFlags } from '../hooks/useFlags'

export default function FlagDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    flags,
    dependencies,
    updateFlag,
    addDependency,
    removeDependency,
    loading,
    error,
  } = useFlags()

  const [cycleError, setCycleError] = useState<{ flagA: Flag | null; flagB: Flag | null } | null>(null)

  const flag = flags.find(f => f.id === id)

  if (loading) {
    return <div className="py-6 px-10 text-slate-400">Loading...</div>
  }

  if (!flag) {
    return (
      <div className="py-6 px-10">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Flag not found</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Flags
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 px-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300 mb-2"
          >
            ← Back to Flags
          </button>
          <h1 className="text-3xl font-bold text-white">{flag.name}</h1>
        </div>
      </div>

      {error && !error.message.toLowerCase().includes('cycle') && !error.message.toLowerCase().includes('circular') && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit form */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Edit Flag</h2>
          <FlagForm
            onSubmit={async (name, desc) => {
              await updateFlag(id!, name, desc)
            }}
            initialName={flag.name}
            initialDescription={flag.description}
            submitLabel="Update"
          />
        </div>

        {/* State per environment */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Environment States</h2>
          <div className="space-y-3">
            {(['dev', 'staging', 'prod'] as const).map(env => (
              <div
                key={env}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded"
              >
                <span className="font-medium text-slate-300 capitalize">{env}</span>
                <div
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    flag.states[env]
                      ? 'bg-green-900 text-green-200'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {flag.states[env] ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <div className="card">
        <DependencyList
          flagId={id!}
          allFlags={flags}
          dependencies={dependencies}
          onAdd={async (type, depId) => {
            try {
              await addDependency(id!, type, depId)
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message.toLowerCase() : ''
              if (errorMsg.includes('cycle') || errorMsg.includes('circular')) {
                // Show cycle modal
                setCycleError({
                  flagA: flag || null,
                  flagB: flags.find(f => f.id === depId) || null,
                })
              }
            }
          }}
          onRemove={async (depId) => {
            await removeDependency(depId)
          }}
        />
      </div>

      {/* Cycle Modal */}
      <CycleModal
        isOpen={cycleError !== null}
        flagA={cycleError?.flagA || null}
        flagB={cycleError?.flagB || null}
        onClose={() => setCycleError(null)}
      />
    </div>
  )
}
