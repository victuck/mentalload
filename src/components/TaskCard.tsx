'use client'

import type { Task, Profile } from '@/lib/types'

interface Props {
  task: Task
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
}

export function TaskCard({ task, members, currentUserId, householdId, onComplete }: Props) {
  const owner = members.find(m => m.id === task.owner_id)
  const isOwner = task.owner_id === currentUserId

  async function handleComplete() {
    await fetch(`/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id }),
    })
    onComplete(task.id)
  }

  return (
    <div className="bg-white rounded-lg border p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {owner && <span className="text-xs text-gray-500">{owner.name}</span>}
          <span className="text-xs text-gray-500 capitalize">{task.category}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 capitalize">{task.effort}</span>
          {task.is_invisible_work && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-purple-600">invisible work</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={handleComplete}
        className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${
          isOwner
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
      >
        {isOwner ? 'Done' : 'I picked this up'}
      </button>
    </div>
  )
}
