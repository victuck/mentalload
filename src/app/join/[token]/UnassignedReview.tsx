'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, Profile, Category, Effort, Frequency } from '@/lib/types'

const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'other']
const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom']
const EFFORTS: Effort[] = ['low', 'medium', 'high']
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'

interface Props {
  tasks: Task[]
  householdId: string
  userId: string
  members: Profile[]
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
      <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
    </div>
  )
}

export function UnassignedReview({ tasks, householdId, userId, members }: Props) {
  const router = useRouter()

  const [index, setIndex] = useState(0)
  const current = tasks[index]

  const [title, setTitle] = useState(current.title)
  const [category, setCategory] = useState<Category>(current.category)
  const [effort, setEffort] = useState<Effort>(current.effort)
  const [frequency, setFrequency] = useState<Frequency>(current.frequency)
  const [nextDueDate, setNextDueDate] = useState(current.next_due_date ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function loadTask(task: Task) {
    setTitle(task.title)
    setCategory(task.category)
    setEffort(task.effort)
    setFrequency(task.frequency)
    setNextDueDate(task.next_due_date ?? '')
  }

  function advance() {
    const next = index + 1
    if (next >= tasks.length) {
      router.push(`/h/${householdId}/balance`)
    } else {
      setIndex(next)
      loadTask(tasks[next])
    }
  }

  async function handleClaim() {
    setSaving(true)
    await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: current.id,
        title,
        owner_id: userId,
        category,
        effort,
        frequency,
        next_due_date: nextDueDate || null,
      }),
    })
    setSaving(false)
    advance()
  }

  async function handleDelete() {
    await fetch(`/h/${householdId}/tasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id }),
    })
    setConfirmDelete(false)
    advance()
  }

  return (
    <div className="relative w-full space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Task {index + 1} of {tasks.length}</span>
          <button type="button" onClick={() => router.push(`/h/${householdId}/balance`)}
            className="text-xs text-slate-400 hover:text-slate-600">
            Finish early
          </button>
        </div>
        <StepIndicator current={index} total={tasks.length} />
        <h2 className="text-lg font-semibold text-slate-900 mb-0.5">Unassigned tasks</h2>
        <p className="text-sm text-slate-500">Review each task and claim the ones that are yours.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={INPUT} />
        </div>

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
            <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={INPUT}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Next due</label>
            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className={INPUT} />
          </div>
        </div>
      </div>

      <button onClick={handleClaim} disabled={saving}
        className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {saving ? 'Claiming…' : 'This is mine'}
      </button>

      <button type="button" onClick={advance}
        className="w-full border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
        Not mine, skip
      </button>

      <div className="flex justify-between">
        <button type="button" onClick={() => { setIndex(index - 1); loadTask(tasks[index - 1]) }}
          disabled={index === 0}
          className="text-sm text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-colors">
          ← Go back
        </button>
        <button type="button" onClick={() => setConfirmDelete(true)}
          className="text-sm text-rose-500 hover:text-rose-700 transition-colors">
          Delete
        </button>
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-slate-900 font-semibold text-center">Delete &ldquo;{title}&rdquo;?</p>
          <p className="text-sm text-slate-500 text-center">This can&apos;t be undone.</p>
          <div className="flex gap-3 w-full">
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleDelete}
              className="flex-1 bg-rose-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-rose-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
