'use client'

import type { Task, Profile } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onSnooze: (taskId: string) => void
  onUpdate?: (task: Task) => void
}

export function UnassignedPool({ tasks, members, currentUserId, householdId, onComplete, onDelete, onSnooze, onUpdate }: Props) {
  if (tasks.length === 0) return null

  return (
    <section className="mb-6 bg-sand rounded-2xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
        Needs an owner ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            currentUserId={currentUserId}
            householdId={householdId}
            onComplete={onComplete}
            onDelete={onDelete}
            onSnooze={onSnooze}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  )
}
