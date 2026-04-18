import { Link } from 'react-router-dom'
import type { Flag, Environment } from '@repo/types'

interface FlagCardProps {
  flag: Flag
  environment: Environment
  dependencyCount: number
  onToggle: (enabled: boolean) => void
  onToggleLoading?: boolean
}

export default function FlagCard({ 
  flag, 
  environment, 
  dependencyCount, 
  onToggle,
  onToggleLoading
}: FlagCardProps) {
  const isEnabled = flag.states[environment]

  return (
    <div className="card group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            {flag.name}
          </h3>
          {flag.description && (
            <p className="text-sm text-slate-400 mt-1">{flag.description}</p>
          )}
        </div>
        <button
          onClick={() => onToggle(!isEnabled)}
          disabled={onToggleLoading}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-green-600' : 'bg-slate-600'
          } ${onToggleLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
          aria-label={`Toggle ${flag.name}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              isEnabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            isEnabled
              ? 'bg-green-900 text-green-200'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {isEnabled ? 'enabled' : 'disabled'}
        </span>
        {dependencyCount > 0 && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900 text-blue-200">
            {dependencyCount} dependenc{dependencyCount === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      <Link
        to={`/flags/${flag.id}`}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View details →
      </Link>
    </div>
  )
}
