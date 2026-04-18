import { useState } from 'react'

interface FlagFormProps {
  onSubmit: (name: string, description: string) => void | Promise<void>
  isLoading?: boolean
  initialName?: string
  initialDescription?: string
  submitLabel?: string
}

export default function FlagForm({
  onSubmit,
  isLoading,
  initialName = '',
  initialDescription = '',
  submitLabel = 'Create Flag',
}: FlagFormProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Flag name is required')
      return
    }

    try {
      await onSubmit(name, description)
      if (!initialName) {
        setName('')
        setDescription('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
          Flag Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isLoading}
          className="input-base"
          placeholder="e.g., dark-mode"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={isLoading}
          className="input-base"
          placeholder="What does this flag do?"
          rows={3}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Loading...' : submitLabel}
      </button>
    </form>
  )
}
