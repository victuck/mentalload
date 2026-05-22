'use client'

import { useState } from 'react'
import { Plus, CalendarCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { Task, Profile } from '@/lib/types'
import { TaskCard } from '@/components/TaskCard'
import { UnassignedPool } from '@/components/UnassignedPool'
import { TaskForm } from '@/components/TaskForm'
import { Avatar } from '@/components/Avatar'

const TODAY = new Date().toISOString().slice(0, 10)

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  tasks: Task[]
  initialCompletedTasks: Task[]
}

export function TodayView({ householdId, currentUserId, members, tasks: initialTasks, initialCompletedTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [completedTasks, setCompletedTasks] = useState<Task[]>(initialCompletedTasks)
  const [showForm, setShowForm] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)
  const [showOverdue, setShowOverdue] = useState(true)

  function handleComplete(taskId: string) {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)
      if (task) setCompletedTasks(done => [task, ...done])
      return prev.filter(t => t.id !== taskId)
    })
  }

  function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleSnooze(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleUpdate(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  const overdueTasks = tasks.filter(t => t.next_due_date && t.next_due_date < TODAY)
  const dueTodayTasks = tasks.filter(t => !t.next_due_date || t.next_due_date >= TODAY)

  const unassigned = dueTodayTasks.filter(t => t.owner_id === null)
  const assigned = members.map(m => ({
    member: m,
    tasks: dueTodayTasks.filter(t => t.owner_id === m.id),
  }))
  const hasAnyTasks = tasks.length > 0

  const sharedCardProps = { members, currentUserId, householdId, onComplete: handleComplete, onDelete: handleDelete, onSnooze: handleSnooze, onUpdate: handleUpdate }

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

      {overdueTasks.length > 0 && (
        <section className="mb-6">
          <button
            type="button"
            onClick={() => setShowOverdue(s => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors w-full mb-2"
          >
            <AlertCircle size={15} />
            Overdue ({overdueTasks.length})
            {showOverdue ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
          </button>
          {showOverdue && (
            <div className="space-y-2">
              {overdueTasks.map(task => (
                <TaskCard key={task.id} task={task} {...sharedCardProps} />
              ))}
            </div>
          )}
        </section>
      )}

      <UnassignedPool
        tasks={unassigned}
        members={members}
        currentUserId={currentUserId}
        householdId={householdId}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onSnooze={handleSnooze}
        onUpdate={handleUpdate}
      />

      {assigned.map(({ member, tasks: memberTasks }) => (
        memberTasks.length > 0 && (
          <section key={member.id} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Avatar profile={member} size="sm" />
              <h3 className="text-sm font-semibold text-slate-700">{member.name}</h3>
            </div>
            <div className="space-y-2">
              {memberTasks.map(task => (
                <TaskCard key={task.id} task={task} {...sharedCardProps} />
              ))}
            </div>
          </section>
        )
      ))}

      {!hasAnyTasks && completedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nothing due today</p>
          <p className="text-sm text-slate-400 mt-1">Add a task to get started</p>
        </div>
      )}

      {completedTasks.length > 0 && (
        <section className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowCompleted(s => !s)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors w-full"
          >
            {showCompleted ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            Completed ({completedTasks.length})
          </button>

          {showCompleted && (
            <ul className="mt-3 space-y-2">
              {completedTasks.map(task => {
                const owner = members.find(m => m.id === task.owner_id)
                return (
                  <li key={task.id} className="flex items-center gap-2.5 py-1.5">
                    {owner
                      ? <Avatar profile={owner} size="xs" className="w-5 h-5" />
                      : <span className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                    }
                    <span className="text-sm text-slate-400 line-through">{task.title}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
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
