'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { TaskDetailModal } from './TaskDetailModal'
import type { Task, Profile, Category } from '@/lib/types'

const CATEGORY_STYLES: Record<Category, string> = {
  chores:   'bg-violet-100 text-violet-700',
  planning: 'bg-sky-100 text-sky-700',
  errands:  'bg-amber-100 text-amber-700',
  admin:    'bg-emerald-100 text-emerald-700',
  other:    'bg-slate-100 text-slate-600',
}

const EFFORT_STYLES = {
  low:    'text-emerald-600',
  medium: 'text-amber-600',
  high:   'text-rose-600',
}

interface Props {
  task: Task
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function TaskCard({ task, members, currentUserId, householdId, onComplete, onDelete }: Props) {
  const [currentTask, setCurrentTask] = useState(task)
  const [showDetail, setShowDetail] = useState(false)

  const owner = members.find(m => m.id === currentTask.owner_id)
  const isOwner = currentTask.owner_id === currentUserId

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: currentTask.id }),
    })
    onComplete(currentTask.id)
  }

  return (
    <>
      <div
        className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-900 truncate">{currentTask.title}</p>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {owner && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: owner.avatar_colour }}
              >
                {owner.name[0]}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize ${CATEGORY_STYLES[currentTask.category]}`}>
              {currentTask.category}
            </span>
            <span className={`text-xs font-medium capitalize ${EFFORT_STYLES[currentTask.effort]}`}>
              {currentTask.effort}
            </span>
          </div>
        </div>
        <button
          onClick={handleComplete}
          className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            isOwner
              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <CheckCircle2 size={13} /> {isOwner ? 'Done' : "I've done it"}
        </button>
      </div>

      {showDetail && (
        <TaskDetailModal
          task={currentTask}
          members={members}
          householdId={householdId}
          onClose={() => setShowDetail(false)}
          onUpdate={updated => setCurrentTask(updated)}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
