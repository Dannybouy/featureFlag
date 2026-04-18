import EnvSwitcher from '../components/EnvSwitcher'
import GraphCanvas from '../components/graph/GraphCanvas'
import { useFlags } from '../hooks/useFlags'

export default function GraphPage() {
  const {
    flags,
    dependencies,
    environment,
    setEnvironment,
    loading,
  } = useFlags()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading graph...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dependency Graph</h1>
            <p className="text-sm text-slate-400 mt-1">
              {flags.length} flags • {dependencies.length} dependencies
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Environment</p>
            <EnvSwitcher current={environment} onChange={setEnvironment} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-600" />
            <span className="text-slate-300">Enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-600" />
            <span className="text-slate-300">Disabled</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-blue-500" />
              <span className="text-slate-300">Requires</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-red-500" />
              <span className="text-slate-300">Excludes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1">
        {flags.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            No flags to visualize. Create some flags first!
          </div>
        ) : (
          <GraphCanvas
            flags={flags}
            dependencies={dependencies}
            environment={environment}
          />
        )}
      </div>
    </div>
  )
}
