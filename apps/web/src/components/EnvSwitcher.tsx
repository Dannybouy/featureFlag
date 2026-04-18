import type { Environment } from '@repo/types'

interface EnvSwitcherProps {
  current: Environment
  onChange: (env: Environment) => void
}

export default function EnvSwitcher({ current, onChange }: EnvSwitcherProps) {
  const environments: Environment[] = ['dev', 'staging', 'prod']

  return (
    <div className="flex gap-2">
      {environments.map(env => (
        <button
          key={env}
          onClick={() => onChange(env)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            current === env
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {env}
        </button>
      ))}
    </div>
  )
}
