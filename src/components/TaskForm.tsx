'use client'

import { useState } from 'react'
import { X, EyeOff } from 'lucide-react'
import type { Category, Effort, Frequency, Profile, Task } from '@/lib/types'

const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'other']
const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'custom']
const EFFORTS: Effort[] = ['low', 'medium', 'high']

const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'

interface Props {
  householdId: string
  members: Profile[]
  task?: Task
  onSave: (task: Task) => void
  onClose: () => void
}

export function TaskForm({ householdId, members, task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [ownerId, setOwnerId] = useState<string>(task?.owner_id ?? '')
  const [category, setCategory] = useState<Category>(task?.category ?? 'chores')
  const [frequency, setFrequency] = useState<Frequency>(task?.frequency ?? 'weekly')
  const [customLabel, setCustomLabel] = useState(task?.custom_frequency_label ?? '')
  const [customWeight, setCustomWeight] = useState(task?.custom_frequency_weight?.toString() ?? '1')
  const [nextDueDate, setNextDueDate] = useState(task?.next_due_date ?? new Date().toISOString().slice(0, 10))
  const [effort, setEffort] = useState<Effort>(task?.effort ?? 'medium')
  const [isInvisible, setIsInvisible] = useState(task?.is_invisible_work ?? false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const method = task ? 'PATCH' : 'POST'
  const url = `/h/${householdId}/tasks`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body: Record<string, unknown> = {
      ...(task ? { id: task.id } : {}),
      title,
      owner_id: ownerId || null,
      category,
      frequency,
      effort,
      is_invisible_work: isInvisible,
      next_due_date: nextDueDate,
      ...(frequency === 'custom' ? { custom_frequency_label: customLabel, custom_frequency_weight: parseInt(customWeight, 10) } : {}),
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    onSave(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{task ? 'Edit task' : 'Add task'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">Title</label>
            <input id="title" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekly food shop"
              className={INPUT} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="owner" className="text-sm font-medium text-slate-700">Owner</label>
            <select id="owner" value={ownerId} onChange={e => setOwnerId(e.target.value)} className={INPUT}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium text-slate-700">Category</label>
              <select id="category" value={category} onChange={e => setCategory(e.target.value as Category)} className={INPUT}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="effort" className="text-sm font-medium text-slate-700">Effort</label>
              <select id="effort" value={effort} onChange={e => setEffort(e.target.value as Effort)} className={INPUT}>
                {EFFORTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="frequency" className="text-sm font-medium text-slate-700">Frequency</label>
            <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={INPUT}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {frequency === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="customLabel" className="text-sm font-medium text-slate-700">Label</label>
                <input id="customLabel" required value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                  placeholder='e.g. "Each term"'
                  className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="customWeight" className="text-sm font-medium text-slate-700">Weight (1–10)</label>
                <input id="customWeight" type="number" min="1" max="10" required value={customWeight} onChange={e => setCustomWeight(e.target.value)}
                  className={INPUT} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="nextDueDate" className="text-sm font-medium text-slate-700">Next due date</label>
            <input id="nextDueDate" type="date" required value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
              className={INPUT} />
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer py-2.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <input type="checkbox" checked={isInvisible} onChange={e => setIsInvisible(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <EyeOff size={15} className="text-purple-500 shrink-0" />
            <span className="text-slate-700">Invisible work <span className="text-slate-400">(planning / remembering)</span></span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : 'Save task'}
          </button>
        </div>
      </form>
    </div>
  )
}
