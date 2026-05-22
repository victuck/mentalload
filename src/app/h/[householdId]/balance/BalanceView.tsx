'use client'

import { useState } from 'react'
import { Plus, AlertCircle, Info, X } from 'lucide-react'
import type { Task, TaskCompletion, Profile } from '@/lib/types'
import { calculateBalanceScores } from '@/lib/balance'
import { BalanceChart } from '@/components/BalanceChart'
import { Avatar } from '@/components/Avatar'
import { TaskForm } from '@/components/TaskForm'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { MemberDetailModal } from '@/components/MemberDetailModal'

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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const now = new Date()
  const cutoffs: Record<Period, Date> = {
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  }

  const periodCompletions = completions.filter(c => new Date(c.completed_at) >= cutoffs[period])
  const scores = calculateBalanceScores(members, tasks, periodCompletions)

  const unassigned = tasks.filter(t => t.owner_id === null)

  const enrichedCompletions = completions.map(c => ({ ...c, task: tasks.find(t => t.id === c.task_id) }))

  const selectedMember = selectedMemberId ? members.find(m => m.id === selectedMemberId) : null

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [bulkAssignId, setBulkAssignId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  async function assignAll() {
    if (!bulkAssignId) return
    setAssigning(true)
    await Promise.all(unassigned.map(async t => {
      const res = await fetch(`/h/${householdId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, owner_id: bulkAssignId }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTasks(prev => prev.map(x => x.id === t.id ? updated : x))
      }
    }))
    setAssigning(false)
    setBulkAssignId('')
  }

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Load distribution</h2>
          <button
            type="button"
            onClick={() => setShowInfo(s => !s)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="How is this calculated?"
          >
            <Info size={15} />
          </button>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      {showInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-sm text-slate-700 space-y-2 relative">
          <button type="button" onClick={() => setShowInfo(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={14} /></button>
          <p className="font-medium text-slate-900">How the percentage is calculated</p>
          <p>Each task has a <strong>score = frequency weight × effort weight</strong>. Your share is your total score as a percentage of the household total.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
            <div>
              <p className="font-medium text-slate-700 mb-0.5">Effort</p>
              <p>Low = 1 · Medium = 2 · High = 3</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-0.5">Frequency</p>
              <p>Daily = 7 · Weekly = 4 · Monthly = 2</p>
              <p>Quarterly / Annual / One-off = 1</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Pickups (completing someone else's task) add the effort weight once, without the frequency multiplier — you did it once, not taken on the recurring load.</p>
        </div>
      )}

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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="flex gap-3 mb-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-800">
              {unassigned.length} task{unassigned.length > 1 ? 's need' : ' needs'} an owner
            </p>
          </div>

          <ul className="space-y-1.5 mb-4">
            {unassigned.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTask(t)}
                  className="w-full text-left text-sm text-amber-800 px-3 py-2 rounded-lg bg-amber-100/60 hover:bg-amber-100 transition-colors truncate"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 border-t border-amber-200 pt-3">
              <select
                value={bulkAssignId}
                onChange={e => setBulkAssignId(e.target.value)}
                className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Assign all to…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={assignAll}
                disabled={!bulkAssignId || assigning}
                className="text-xs font-medium px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors shrink-0"
              >
                {assigning ? 'Assigning…' : 'Assign all'}
              </button>
            </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(member => {
          const memberTasks = tasks.filter(t => t.owner_id === member.id)
          const score = scores.find(s => s.member_id === member.id)
          return (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className="w-full flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar profile={member} size="md" />
                <div>
                  <span className="font-medium text-sm text-slate-900">{member.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {score && (
                <span className="text-xs text-slate-400">{Math.round(score.percentage)}%</span>
              )}
            </button>
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

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          householdId={householdId}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
          onDelete={id => setTasks(prev => prev.filter(t => t.id !== id))}
        />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          tasks={tasks.filter(t => t.owner_id === selectedMember.id)}
          score={scores.find(s => s.member_id === selectedMember.id)}
          completions={enrichedCompletions}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  )
}
