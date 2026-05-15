'use client'
import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import type { SuggestedTask, Frequency, Category, Effort } from '@/lib/types'

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

const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom']
const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'other']
const EFFORTS: Effort[] = ['low', 'medium', 'high']
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'

function defaultDueDate(frequency: Frequency): string {
  const today = new Date()
  if (frequency === 'annual') {
    today.setFullYear(today.getFullYear() + 1)
  }
  return today.toISOString().slice(0, 10)
}

export function SuggestionsModal({ suggestions, householdId, members, onDone }: Props) {
  // Stage 1: select
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Stage 2: review
  const [phase, setPhase] = useState<'select' | 'review'>('select')
  const [queue, setQueue] = useState<SuggestedTask[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)

  // Stage 2 form state (reset per task)
  const [title, setTitle] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [category, setCategory] = useState<Category>('chores')
  const [effort, setEffort] = useState<Effort>('medium')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [nextDueDate, setNextDueDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(i: number) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function loadTask(task: SuggestedTask) {
    setTitle(task.title)
    setOwnerId('')
    setCategory(task.category)
    setEffort(task.effort)
    setFrequency(task.frequency)
    setNextDueDate(defaultDueDate(task.frequency))
    setError(null)
  }

  function startReview() {
    const q = suggestions.filter((_, i) => selected.has(i))
    setQueue(q)
    setReviewIndex(0)
    loadTask(q[0])
    setPhase('review')
  }

  async function handleAdd() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        owner_id: ownerId || null,
        category,
        frequency,
        effort,
        is_invisible_work: false,
        next_due_date: nextDueDate || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create task')
      return
    }
    advance()
  }

  function advance() {
    const next = reviewIndex + 1
    if (next >= queue.length) {
      onDone()
    } else {
      setReviewIndex(next)
      loadTask(queue[next])
    }
  }

  // ── Stage 1: select ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="w-full space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Suggested tasks</h2>
          <p className="text-sm text-slate-500 mt-1">Select the tasks that apply to your household, then you can customise each one.</p>
        </div>

        <ul className="space-y-2">
          {suggestions.map((s, i) => {
            const on = selected.has(i)
            return (
              <li key={`${s.title}-${s.category}-${s.effort}`}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={`w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-all flex items-center justify-between gap-2 ${
                    on
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  {on && <Check size={14} className="shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={selected.size > 0 ? startReview : onDone}
          className="w-full bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          {selected.size > 0
            ? <><span>Review {selected.size} task{selected.size === 1 ? '' : 's'}</span><ChevronRight size={16} /></>
            : 'Skip for now'
          }
        </button>
      </div>
    )
  }

  // ── Stage 2: review one at a time ────────────────────────────────────────────
  const progress = reviewIndex / queue.length

  return (
    <div className="w-full space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Task {reviewIndex + 1} of {queue.length}</span>
          <button type="button" onClick={onDone} className="text-xs text-slate-400 hover:text-slate-600">Finish early</button>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${(progress) * 100}%` }} />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={INPUT} />
        </div>

        {members.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Owner</label>
            <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={INPUT}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} className={INPUT}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Effort</label>
            <select value={effort} onChange={e => setEffort(e.target.value as Effort)} className={INPUT}>
              {EFFORTS.map(e => <option key={e} value={e}>{e[0].toUpperCase() + e.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Frequency</label>
            <select value={frequency} onChange={e => {
              const f = e.target.value as Frequency
              setFrequency(f)
              setNextDueDate(defaultDueDate(f))
            }} className={INPUT}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Next due</label>
            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className={INPUT} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Adding…' : 'Add task'}
        </button>
        <button
          type="button"
          onClick={advance}
          className="px-4 py-2.5 text-sm text-rose-500 hover:text-rose-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
