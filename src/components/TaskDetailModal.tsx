'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, ArrowUpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile, Category, Effort, Frequency } from '@/lib/types'

const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'garden', 'other']
const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annual', 'custom']
const EFFORTS: Effort[] = ['low', 'medium', 'high']
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'

interface Completion {
  id: string
  completed_at: string
  is_pickup: boolean
  completed_by: string
}

interface Props {
  task: Task
  members: Profile[]
  householdId: string
  placeholderMemberIds?: string[]
  onClose: () => void
  onUpdate: (task: Task) => void
  onDelete?: (taskId: string) => void
}

const supabase = createClient()

export function TaskDetailModal({ task, members, householdId, placeholderMemberIds, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(task.title)
  const [ownerId, setOwnerId] = useState(task.owner_id ?? task.placeholder_owner_id ?? '')
  const [category, setCategory] = useState<Category>(task.category)
  const [frequency, setFrequency] = useState<Frequency>(task.frequency)
  const [customLabel, setCustomLabel] = useState(task.custom_frequency_label ?? '')
  const [customWeight, setCustomWeight] = useState(task.custom_frequency_weight?.toString() ?? '1')
  const [nextDueDate, setNextDueDate] = useState(task.next_due_date ?? '')
  const [effort, setEffort] = useState<Effort>(task.effort)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [isInvisible] = useState(task.is_invisible_work)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isShared, setIsShared] = useState(task.is_shared)
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(task.current_turn_user_id)
  const [switchingTurn, setSwitchingTurn] = useState(false)

  const [completions, setCompletions] = useState<Completion[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    supabase
      .from('task_completions')
      .select('id, completed_at, is_pickup, completed_by')
      .eq('task_id', task.id)
      .order('completed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setCompletions(data ?? [])
        setLoadingHistory(false)
      })
  }, [task.id])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const isPlaceholder = !!ownerId && (placeholderMemberIds ?? []).includes(ownerId)
    const body: Record<string, unknown> = {
      id: task.id,
      title,
      owner_id: isShared ? null : (isPlaceholder ? null : (ownerId || null)),
      placeholder_owner_id: isShared ? null : (isPlaceholder ? ownerId : null),
      category,
      frequency,
      effort,
      is_invisible_work: isInvisible,
      next_due_date: nextDueDate || null,
      notes: notes.trim() || null,
      is_shared: isShared,
      ...(frequency === 'custom' ? {
        custom_frequency_label: customLabel,
        custom_frequency_weight: parseInt(customWeight, 10),
      } : {}),
    }
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setSaveError(data.error); setSaving(false); return }
    onUpdate(data)
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/h/${householdId}/tasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id }),
    })
    onDelete?.(task.id)
    onClose()
  }

  async function handleSwitchTurn() {
    setSwitchingTurn(true)
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch_turn', task_id: task.id }),
    })
    const data = await res.json()
    setSwitchingTurn(false)
    if (!res.ok) { setSaveError(data.error); return }
    setCurrentTurnUserId(data.current_turn_user_id)
    onUpdate({ ...task, current_turn_user_id: data.current_turn_user_id })
  }

  function memberName(userId: string) {
    return members.find(m => m.id === userId)?.name ?? 'Unknown'
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Task details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Edit form */}
          <div className="px-6 py-5 space-y-4">
            {saveError && (
              <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={INPUT} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Owner</label>
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setIsShared(false)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    !isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Assigned
                </button>
                <button
                  type="button"
                  onClick={() => setIsShared(true)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isShared ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Shared
                </button>
              </div>
              {!isShared ? (
                <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={INPUT}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Current turn</p>
                    <p className="text-sm font-medium text-slate-900">
                      {currentTurnUserId
                        ? (members.find(m => m.id === currentTurnUserId)?.name ?? 'Unknown')
                        : 'Not set'
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchTurn}
                    disabled={switchingTurn}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    {switchingTurn ? 'Switching…' : 'Switch turns'}
                  </button>
                </div>
              )}
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className={INPUT}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>

            {frequency === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Label</label>
                  <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                    placeholder='e.g. "Each term"' className={INPUT} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Times per year</label>
                  <input type="number" min="1" max="52" value={customWeight}
                    onChange={e => setCustomWeight(e.target.value)} className={INPUT} />
                </div>
              </div>
            )}

            {frequency !== 'one-off' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Next due date</label>
                <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className={INPUT} />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any extra context…"
                rows={3}
                className={`${INPUT} resize-none`} />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>

          {/* Completion history */}
          <div className="border-t border-slate-100 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Completion history</h3>
            {loadingHistory ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : completions.length === 0 ? (
              <p className="text-sm text-slate-400">No completions yet.</p>
            ) : (
              <ul className="space-y-2">
                {completions.map(c => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    {c.is_pickup
                      ? <ArrowUpCircle size={14} className="text-amber-500 shrink-0" />
                      : <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                    }
                    <span className="text-slate-700 font-medium">{memberName(c.completed_by)}</span>
                    <span className="text-slate-400">{c.is_pickup ? 'picked up' : 'completed'}</span>
                    <span className="text-slate-400 ml-auto">{formatDate(c.completed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-slate-900 font-semibold text-center">Delete &ldquo;{task.title}&rdquo;?</p>
          <p className="text-sm text-slate-500 text-center">This can&apos;t be undone.</p>
          <div className="flex gap-3 w-full">
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="flex-1 bg-rose-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
