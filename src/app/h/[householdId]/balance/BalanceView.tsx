'use client'

import { useState } from 'react'
import type { Task, TaskCompletion, Profile } from '@/lib/types'
import { calculateBalanceScores } from '@/lib/balance'
import { BalanceChart } from '@/components/BalanceChart'
import { TaskForm } from '@/components/TaskForm'

type Period = 'week' | 'month' | 'year'

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  tasks: Task[]
  completions: TaskCompletion[]
}

export function BalanceView({ householdId, members, tasks: initialTasks, completions }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const now = new Date()
  const cutoffs: Record<Period, Date> = {
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  }

  const periodCompletions = completions.filter(c => new Date(c.completed_at) >= cutoffs[period])
  const scores = calculateBalanceScores(members, tasks, periodCompletions)

  const unassigned = tasks.filter(t => t.owner_id === null)

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Load distribution</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          + Add task
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'This year'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <BalanceChart scores={scores} members={members} />
      </div>

      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            {unassigned.length} task{unassigned.length > 1 ? 's need' : ' needs'} an owner
          </h3>
          <ul className="space-y-1">
            {unassigned.map(t => (
              <li key={t.id} className="text-sm text-amber-700">{t.title}</li>
            ))}
          </ul>
        </div>
      )}

      {members.map(member => {
        const memberTasks = tasks.filter(t => t.owner_id === member.id)
        if (memberTasks.length === 0) return null
        const isExpanded = expandedMember === member.id
        return (
          <section key={member.id} className="mb-4">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : member.id)}
              className="w-full flex items-center justify-between bg-white rounded-xl border p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: member.avatar_colour }}
                >
                  {member.name[0]}
                </span>
                <span className="font-medium text-sm">{member.name}</span>
                <span className="text-xs text-gray-400">{memberTasks.length} tasks</span>
              </div>
              <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="mt-1 space-y-1 pl-2">
                {memberTasks.map(t => (
                  <div key={t.id} className="bg-white border rounded-lg px-4 py-2 text-sm flex justify-between">
                    <span>{t.title}</span>
                    <span className="text-gray-400 capitalize">{t.frequency} · {t.effort}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

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
