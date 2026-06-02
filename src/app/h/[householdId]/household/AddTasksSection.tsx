'use client'

import { useState } from 'react'
import { Plus, Check, ChevronRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TaskForm } from '@/components/TaskForm'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { getSuggestionsForProfile } from '@/lib/suggestions'
import { coerceProfile } from '@/lib/types'
import type { HouseholdMember, SuggestedTask, Task, Profile } from '@/lib/types'

const supabase = createClient()

const SECTION = 'bg-white border border-slate-200 rounded-xl overflow-hidden'
const SUMMARY = 'flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer select-none hover:bg-slate-50 transition-colors'

interface Props {
  householdId: string
  currentUserId: string
  members: HouseholdMember[]
}

export function AddTasksSection({ householdId, currentUserId, members }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [profileMembers, setProfileMembers] = useState<Profile[]>([])
  const [placeholderIds, setPlaceholderIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<Task[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)

  const memberNames = Object.fromEntries(members.map(m => [m.profile.id, m.profile.name]))

  async function handleAddSelected() {
    if (selected.size === 0) return
    setAdding(true)
    const today = new Date().toISOString().slice(0, 10)
    const toAdd = suggestions.filter((_, i) => selected.has(i))
    const responses = await Promise.all(toAdd.map(s => fetch(`/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: s.title,
        owner_id: null,
        category: s.category,
        frequency: s.frequency,
        effort: s.effort,
        is_invisible_work: false,
        next_due_date: today,
      }),
    })))
    const created = await Promise.all(responses.map(r => r.json())) as Task[]
    setAdding(false)
    setSuggestions(prev => prev.filter((_, i) => !selected.has(i)))
    setSelected(new Set())
    setReviewQueue(created)
    setReviewIndex(0)
  }

  async function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded) {
      setLoading(true)
      const [{ data: householdData }, { data: tasks }, { data: placeholders }] = await Promise.all([
        supabase.from('households').select('profile').eq('id', householdId).single(),
        supabase.from('tasks').select('title').eq('household_id', householdId),
        supabase.from('placeholder_members').select('id, name').eq('household_id', householdId),
      ])
      const profile = coerceProfile(householdData?.profile)
      const existingTitles = (tasks ?? []).map((t: { title: string }) => t.title)
      const phMembers = (placeholders ?? []) as { id: string; name: string }[]
      setProfileMembers(members.map(m => m.profile))
      setPlaceholderIds(phMembers.map(p => p.id))
      setSuggestions(getSuggestionsForProfile(profile, existingTitles, memberNames))
      setLoading(false)
      setLoaded(true)
    }
  }

  function toggle(i: number) {
    setSelected(s => {
      const next = new Set(s)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function dismiss(i: number) {
    setSuggestions(prev => prev.filter((_, idx) => idx !== i))
    setSelected(prev => {
      const next = new Set<number>()
      prev.forEach(idx => { if (idx < i) next.add(idx); else if (idx > i) next.add(idx - 1) })
      return next
    })
  }

  function advanceReview() {
    setReviewIndex(i => i + 1)
  }

  const reviewTask = reviewIndex < reviewQueue.length ? reviewQueue[reviewIndex] : null

  return (
    <>
      <div className={SECTION}>
        <button type="button" onClick={handleToggle} className={SUMMARY}>
          Add tasks
          <span className={`text-slate-400 text-xs font-normal transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {open && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2">
            {loading ? (
              <p className="text-sm text-slate-400 py-2">Loading suggestions…</p>
            ) : (
              <>
                {/* Custom task */}
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full flex items-center gap-2 text-left border border-dashed border-indigo-300 rounded-xl px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                >
                  <Plus size={14} className="shrink-0" />
                  Custom task
                </button>

                {/* Suggested tasks */}
                {suggestions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-1 px-1">All suggested tasks for your household profile are already added.</p>
                ) : (
                  <>
                    <ul className="space-y-1.5">
                      {suggestions.map((s, i) => {
                        const on = selected.has(i)
                        return (
                          <li key={`${s.title}-${i}`} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggle(i)}
                              className={`flex-1 min-w-0 text-left rounded-xl border px-4 py-2.5 text-sm transition-all flex items-center justify-between gap-2 ${
                                on
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                              }`}
                            >
                              <span className="truncate">{s.title}</span>
                              {on && <Check size={14} className="shrink-0" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => dismiss(i)}
                              title="Not interested"
                              className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>

                    {selected.size > 0 && (
                      <button
                        type="button"
                        onClick={handleAddSelected}
                        disabled={adding}
                        className="w-full bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-1"
                      >
                        {adding ? 'Adding…' : <>Add {selected.size} task{selected.size === 1 ? '' : 's'}<ChevronRight size={16} /></>}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {reviewTask && (
        <TaskDetailModal
          task={reviewTask}
          members={profileMembers}
          householdId={householdId}
          currentUserId={currentUserId}
          placeholderMemberIds={placeholderIds}
          onClose={advanceReview}
          onUpdate={updated => setReviewQueue(q => q.map((t, i) => i === reviewIndex ? updated : t))}
        />
      )}

      {showCustomForm && (
        <TaskForm
          householdId={householdId}
          members={profileMembers}
          placeholderMemberIds={placeholderIds}
          onSave={(_task: Task) => {}}
          onClose={() => setShowCustomForm(false)}
        />
      )}
    </>
  )
}
