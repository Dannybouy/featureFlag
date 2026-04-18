import type { Flag } from '@repo/types'

interface CycleModalProps {
  isOpen: boolean
  flagA: Flag | null
  flagB: Flag | null
  onClose: () => void
}

export default function CycleModal({
  isOpen,
  flagA,
  flagB,
  onClose,
}: CycleModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">í´„</div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Circular Dependency Detected
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              This dependency would create a cycle in the dependency graph.
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-slate-700/30 p-4 rounded">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">From:</span>
            <span className="text-white">{flagA?.name || 'Unknown'}</span>
          </div>
          <div className="flex justify-center text-slate-500 text-lg">â†“</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">To:</span>
            <span className="text-white">{flagB?.name || 'Unknown'}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          This would create a circular reference. Try creating the dependency in the opposite direction or remove conflicting dependencies first.
        </p>

        <button
          onClick={onClose}
          className="w-full btn-primary"
        >
          OK, got it
        </button>
      </div>
    </div>
  )
}
