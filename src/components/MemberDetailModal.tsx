'use client'

import { X, CheckCircle2, ArrowUpCircle } from 'lucide-react'
import type { Task, Profile, TaskCompletion, BalanceScore } from '@/lib/types'
import { Avatar } from './Avatar'

interface Props {
  member: Profile
  tasks: Task[]
  score: BalanceScore | undefined
  completions: TaskCompletion[]
  onClose: () => void
}

const CATEGORY_STYLES: Record<string, string> = {
  chores:   'bg-peach text-slate-800',
  planning: 'bg-slate-200 text-slate-700',
  errands:  'bg-sand text-slate-800',
  admin:    'bg-indigo-100 text-indigo-800',
  garden:   'bg-green-100 text-green-800',
  other:    'bg-slate-100 text-slate-600',
}

const EFFORT_STYLES: Record<string, string> = {
  low:    'text-green-600',
  medium: 'text-amber-500',
  high:   'text-rose-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function MemberDetailModal({ member, tasks, score, completions, onClose }: Props) {
  const memberCompletions = completions
    .filter(c => c.completed_by === member.id)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, 15)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar profile={member} size="md" className="w-10 h-10 text-base" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{member.name}</h2>
              {score && (
                <p className="text-sm text-slate-400">{Math.round(score.percentage)}% of household load</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Tasks */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Tasks <span className="text-slate-400 font-normal">({tasks.length})</span>
            </h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400">No tasks assigned.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{t.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize ${CATEGORY_STYLES[t.category]}`}>
                        {t.category}
                      </span>
                      <span className={`text-xs font-medium capitalize ${EFFORT_STYLES[t.effort]}`}>
                        {t.effort}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{t.frequency}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Completions */}
          <div className="border-t border-slate-100 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent activity</h3>
            {memberCompletions.length === 0 ? (
              <p className="text-sm text-slate-400">No completions in this period.</p>
            ) : (
              <ul className="space-y-2">
                {memberCompletions.map(c => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    {c.is_pickup
                      ? <ArrowUpCircle size={14} className="text-amber-500 shrink-0" />
                      : <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                    }
                    <span className="text-slate-700 flex-1 truncate">
                      {c.task?.title ?? 'Task'}
                    </span>
                    <span className="text-slate-400 shrink-0">{formatDate(c.completed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
