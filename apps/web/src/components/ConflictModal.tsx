import type { Flag, SuggestedAction, ValidationResult } from '@repo/types'
import { useState } from 'react'

interface ConflictModalProps {
  isOpen: boolean
  validation: ValidationResult | null
  allFlags: Map<string, Flag>
  flagId: string | null
  flagName: string | null
  onResolve: (actions: SuggestedAction[]) => Promise<void>
  onCancel: () => void
}

export default function ConflictModal({
  isOpen,
  validation,
  allFlags,
  flagId,
  flagName,
  onResolve,
  onCancel,
}: ConflictModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())

  if (!isOpen || !validation || validation.valid) {
    return null
  }

  // Debug logging
  console.log('ConflictModal rendering with:', {
    isOpen,
    validation,
    flagId,
    flagName,
    suggestedActionsCount: validation.suggestedActions?.length ?? 0,
  })

  const handleToggleAction = (flagId: string) => {
    const next = new Set(selectedActions)
    if (next.has(flagId)) {
      next.delete(flagId)
    } else {
      next.add(flagId)
    }
    setSelectedActions(next)
  }

  const handleResolve = async () => {
    setLoading(true)
    try {
      // Get the full action objects for selected flag IDs
      const actionsToResolve = validation.suggestedActions?.filter(
        action => selectedActions.has(action.flagId)
      ) ?? []
      await onResolve(actionsToResolve)
      onCancel()
    } finally {
      setLoading(false)
    }
  }

  const actionStatement = validation && validation.suggestedActions && validation.suggestedActions.length > 0 ? validation.suggestedActions[0].action : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-lg w-full mx-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Cannot {actionStatement} "{flagName || flagId}"
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {validation.reason || 'Prerequisites are not met. The following flags must be enabled first:'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {validation.suggestedActions && validation.suggestedActions.length > 0 ? (
            validation.suggestedActions.map(action => {
              const flag = allFlags.get(action.flagId)
              const isSelected = selectedActions.has(action.flagId)
              
              return (
                <button
                  key={action.flagId}
                  onClick={() => handleToggleAction(action.flagId)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-900/50 border-blue-600 text-white'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-500'
                    }`}>
                      {isSelected && <div className="text-white text-xs leading-4 ml-1 -mt-0.5">✓</div>}
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {flag?.name || action.flagName || action.flagId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {action.reason}
                      </p>
                      {flag?.description && (
                        <p className="text-xs opacity-50 mt-1">{flag.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="p-3 rounded bg-slate-700/30 border border-slate-600 text-slate-400 text-sm">
              No suggested actions available. Check the error details above.
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={loading || selectedActions.size === 0}
            className="flex-1 btn-primary"
          >
            {loading ? 'Resolving...' : 'Resolve'}
          </button>
        </div>
      </div>
    </div>
  )
}
