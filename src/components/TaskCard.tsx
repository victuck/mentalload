'use client'

import { useState } from 'react'
import { TaskDetailModal } from './TaskDetailModal'
import { Avatar } from './Avatar'
import type { Task, Profile, Category } from '@/lib/types'

const TOMORROW = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})()

const CATEGORY_STYLES: Record<Category, string> = {
  chores:   'bg-peach text-slate-800',
  planning: 'bg-slate-200 text-slate-700',
  errands:  'bg-sand text-slate-800',
  admin:    'bg-indigo-100 text-indigo-800',
  garden:   'bg-green-100 text-green-800',
  other:    'bg-slate-100 text-slate-600',
}

const EFFORT_STYLES = {
  low:    'text-green-600',
  medium: 'text-amber-500',
  high:   'text-rose-600',
}

interface Props {
  task: Task
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onSnooze: (task: Task) => void
  onUpdate?: (task: Task) => void
}

export function TaskCard({ task, members, currentUserId, householdId, onComplete, onDelete, onSnooze, onUpdate }: Props) {
  const [currentTask, setCurrentTask] = useState(task)
  const [showDetail, setShowDetail] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [snoozeDate, setSnoozeDate] = useState(TOMORROW)

  const owner = members.find(m => m.id === currentTask.owner_id)
  const isPickup = currentTask.owner_id !== null && currentTask.owner_id !== currentUserId

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: currentTask.id }),
    })
    onComplete(currentTask.id)
  }

  async function handleSnooze() {
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentTask.id, next_due_date: snoozeDate, snooze: true }),
    })
    const updated = await res.json() as Task
    setCurrentTask(updated)
    setSnoozeOpen(false)
    onSnooze(updated)
  }

  const snoozeCount = currentTask.snooze_count ?? 0

  return (
    <>
      <div
        className="bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{currentTask.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {owner && <Avatar profile={owner} size="xs" />}
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize ${CATEGORY_STYLES[currentTask.category]}`}>
                {currentTask.category}
              </span>
              <span className={`text-xs font-medium capitalize ${EFFORT_STYLES[currentTask.effort]}`}>
                {currentTask.effort}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSnoozeOpen(o => !o)}
              className="text-xs px-2.5 py-1.5 rounded-full font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Snooze
            </button>
            <button
              onClick={handleComplete}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                isPickup
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {isPickup ? 'Picked up' : 'Done'}
            </button>
          </div>
        </div>

        {snoozeCount >= 3 && (
          <p className="mt-2 text-xs text-amber-600">
            Snoozed {snoozeCount}× — worth reviewing?
          </p>
        )}

        {snoozeOpen && (
          <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input
              type="date"
              min={TOMORROW}
              value={snoozeDate}
              autoFocus
              onChange={e => setSnoozeDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleSnooze}
              className="text-xs px-3 py-1.5 rounded-full font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {showDetail && (
        <TaskDetailModal
          task={currentTask}
          members={members}
          householdId={householdId}
          onClose={() => setShowDetail(false)}
          onUpdate={updated => { setCurrentTask(updated); onUpdate?.(updated) }}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
