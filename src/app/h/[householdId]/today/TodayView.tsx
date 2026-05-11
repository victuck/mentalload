'use client'

import { useState } from 'react'
import type { Task, Profile } from '@/lib/types'
import { TaskCard } from '@/components/TaskCard'
import { UnassignedPool } from '@/components/UnassignedPool'
import { TaskForm } from '@/components/TaskForm'

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  tasks: Task[]
}

export function TodayView({ householdId, currentUserId, members, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)

  function handleComplete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  const unassigned = tasks.filter(t => t.owner_id === null)
  const assigned = members.map(m => ({
    member: m,
    tasks: tasks.filter(t => t.owner_id === m.id),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          + Add task
        </button>
      </div>

      <UnassignedPool
        tasks={unassigned}
        members={members}
        currentUserId={currentUserId}
        householdId={householdId}
        onComplete={handleComplete}
      />

      {assigned.map(({ member, tasks: memberTasks }) => (
        memberTasks.length > 0 && (
          <section key={member.id} className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: member.avatar_colour }}
              >
                {member.name[0]}
              </span>
              {member.name}
            </h3>
            <div className="space-y-2">
              {memberTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  members={members}
                  currentUserId={currentUserId}
                  householdId={householdId}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </section>
        )
      ))}

      {showForm && (
        <TaskForm
          householdId={householdId}
          members={members}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
