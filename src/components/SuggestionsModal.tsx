'use client'
import { useState } from 'react'
import type { SuggestedTask } from '@/lib/types'

interface Props {
  suggestions: SuggestedTask[]
  householdId: string
  onDone: () => void
}

export function SuggestionsModal({ suggestions, householdId, onDone }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(i: number) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleDone() {
    setCreating(true)
    setError(null)
    const today = new Date().toISOString().slice(0, 10)
    const toCreate = suggestions.filter((_, i) => selected.has(i))

    try {
      await Promise.all(toCreate.map(task =>
        fetch(`/h/${householdId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            owner_id: null,
            category: task.category,
            frequency: 'weekly',
            effort: task.effort,
            is_invisible_work: task.is_invisible_work,
            next_due_date: today,
          }),
        }).then(async r => {
          if (!r.ok) {
            const text = await r.text()
            try {
              const parsed = JSON.parse(text) as { error?: string }
              throw new Error(parsed.error ?? 'Failed to create task')
            } catch {
              throw new Error('Failed to create task')
            }
          }
        })
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tasks')
      setCreating(false)
      return
    }

    onDone()
  }

  const doneLabel = creating
    ? 'Creating...'
    : selected.size > 0
      ? `Add ${selected.size} task${selected.size === 1 ? '' : 's'} and continue`
      : 'Done'

  return (
    <div className="max-w-sm w-full space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Suggested tasks</h2>
        <p className="text-sm text-gray-600 mt-1">Tap to select tasks that apply to your household.</p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={`${s.title}-${s.category}-${s.effort}`}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`w-full text-left rounded border px-3 py-2 text-sm transition-colors ${
                selected.has(i)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-900 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleDone}
        disabled={creating}
        className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {doneLabel}
      </button>
    </div>
  )
}
