'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import type { SuggestedTask } from '@/lib/types'

interface Member {
  id: string
  name: string
}

interface Props {
  suggestions: SuggestedTask[]
  householdId: string
  members: Member[]
  onDone: () => void
}

const SELECT = 'text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white shrink-0'

export function SuggestionsModal({ suggestions, householdId, members, onDone }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkOwnerId, setBulkOwnerId] = useState('')
  const [taskOwners, setTaskOwners] = useState<Record<number, string>>({})
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

  function ownerFor(i: number): string {
    return taskOwners[i] !== undefined ? taskOwners[i] : bulkOwnerId
  }

  async function handleDone() {
    setCreating(true)
    setError(null)
    const today = new Date().toISOString().slice(0, 10)
    const toCreate = suggestions.filter((_, i) => selected.has(i))

    try {
      await Promise.all(toCreate.map((task, idx) => {
        const originalIdx = suggestions.indexOf(task)
        return fetch(`/h/${householdId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            owner_id: ownerFor(originalIdx) || null,
            category: task.category,
            frequency: 'weekly',
            effort: task.effort,
            is_invisible_work: task.is_invisible_work,
            next_due_date: today,
          }),
        }).then(async r => {
          if (!r.ok) {
            const text = await r.text()
            let message = 'Failed to create task'
            try {
              const parsed = JSON.parse(text) as { error?: string }
              if (parsed.error) message = parsed.error
            } catch {
              // not JSON — use default message
            }
            throw new Error(message)
          }
        })
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tasks')
      setCreating(false)
      return
    }

    onDone()
  }

  const doneLabel = creating
    ? 'Creating…'
    : selected.size > 0
      ? `Add ${selected.size} task${selected.size === 1 ? '' : 's'} and continue`
      : 'Skip for now'

  return (
    <div className="w-full space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Suggested tasks</h2>
        <p className="text-sm text-slate-500 mt-1">Tap tasks to add them. You can always add more later.</p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {members.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">Assign all to</span>
          <select
            value={bulkOwnerId}
            onChange={e => setBulkOwnerId(e.target.value)}
            className={SELECT}
          >
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      <ul className="space-y-2">
        {suggestions.map((s, i) => {
          const on = selected.has(i)
          return (
            <li key={`${s.title}-${s.category}-${s.effort}`} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`flex-1 min-w-0 text-left rounded-xl border px-4 py-2.5 text-sm transition-all flex items-center justify-between gap-2 ${
                  on
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <span className="truncate">{s.title}</span>
                {on && <Check size={14} className="shrink-0" />}
              </button>
              {members.length > 0 && (
                <select
                  value={ownerFor(i)}
                  onChange={e => setTaskOwners(prev => ({ ...prev, [i]: e.target.value }))}
                  className={SELECT}
                  onClick={e => e.stopPropagation()}
                >
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={handleDone}
        disabled={creating}
        className="w-full bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {doneLabel}
      </button>
    </div>
  )
}
