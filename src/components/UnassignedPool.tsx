'use client'

import type { Task, Profile } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
}

export function UnassignedPool({ tasks, members, currentUserId, householdId, onComplete }: Props) {
  if (tasks.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
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
          />
        ))}
      </div>
    </section>
  )
}
