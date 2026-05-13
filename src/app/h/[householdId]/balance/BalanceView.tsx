'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { Task, TaskCompletion, Profile } from '@/lib/types'
import { calculateBalanceScores } from '@/lib/balance'
import { BalanceChart } from '@/components/BalanceChart'
import { TaskForm } from '@/components/TaskForm'

type Period = 'week' | 'month' | 'year'

interface Props {
  householdId: string
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">Load distribution</h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'This year'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
        <BalanceChart scores={scores} members={members} />
      </div>

      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {unassigned.length} task{unassigned.length > 1 ? 's need' : ' needs'} an owner
            </p>
            <ul className="mt-1 space-y-0.5">
              {unassigned.map(t => (
                <li key={t.id} className="text-sm text-amber-700">{t.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(member => {
          const memberTasks = tasks.filter(t => t.owner_id === member.id)
          if (memberTasks.length === 0) return null
          const isExpanded = expandedMember === member.id
          return (
            <section key={member.id}>
              <button
                onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                className="w-full flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: member.avatar_colour }}
                  >
                    {member.name[0]}
                  </span>
                  <div>
                    <span className="font-medium text-sm text-slate-900">{member.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp size={16} className="text-slate-400" />
                  : <ChevronDown size={16} className="text-slate-400" />
                }
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-1 ml-3">
                  {memberTasks.map(t => (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm flex justify-between items-center">
                      <span className="text-slate-800">{t.title}</span>
                      <span className="text-slate-400 capitalize text-xs">{t.frequency} · {t.effort}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

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
