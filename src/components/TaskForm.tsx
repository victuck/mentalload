'use client'

import { useState } from 'react'
import type { Category, Effort, Frequency, Profile, Task } from '@/lib/types'

const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'other']
const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'custom']
const EFFORTS: Effort[] = ['low', 'medium', 'high']

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'Add task'}</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">Title</label>
          <input id="title" required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="space-y-1">
          <label htmlFor="owner" className="text-sm font-medium">Owner</label>
          <select id="owner" value={ownerId} onChange={e => setOwnerId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <select id="category" value={category} onChange={e => setCategory(e.target.value as Category)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="effort" className="text-sm font-medium">Effort</label>
            <select id="effort" value={effort} onChange={e => setEffort(e.target.value as Effort)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {EFFORTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="frequency" className="text-sm font-medium">Frequency</label>
          <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {frequency === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="customLabel" className="text-sm font-medium">Label (e.g. "Each term")</label>
              <input id="customLabel" required value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label htmlFor="customWeight" className="text-sm font-medium">Weight (1–10)</label>
              <input id="customWeight" type="number" min="1" max="10" required value={customWeight} onChange={e => setCustomWeight(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="nextDueDate" className="text-sm font-medium">Next due date</label>
          <input id="nextDueDate" type="date" required value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isInvisible} onChange={e => setIsInvisible(e.target.checked)} />
          Invisible work (planning / remembering)
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
