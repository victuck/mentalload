'use client'

import { useState } from 'react'
import { Plus, CalendarCheck } from 'lucide-react'
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
  const hasAnyTasks = tasks.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={15} />
          Add task
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
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: member.avatar_colour }}
              >
                {member.name[0]}
              </span>
              <h3 className="text-sm font-semibold text-slate-700">{member.name}</h3>
            </div>
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

      {!hasAnyTasks && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nothing due today</p>
          <p className="text-sm text-slate-400 mt-1">Add a task to get started</p>
        </div>
      )}

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
