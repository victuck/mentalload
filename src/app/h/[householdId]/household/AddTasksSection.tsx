'use client'

import { useState } from 'react'
import { Plus, Check, ChevronRight, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TaskForm } from '@/components/TaskForm'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { getSuggestionsForProfile } from '@/lib/suggestions'
import { coerceProfile } from '@/lib/types'
import type { HouseholdMember, SuggestedTask, Task, Profile, HouseholdProfile, Category } from '@/lib/types'

const supabase = createClient()

const SECTION = 'bg-white border border-slate-200 rounded-xl overflow-hidden'
const SUMMARY = 'flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer select-none hover:bg-slate-50 transition-colors'

const CATEGORY_LABELS: Record<Category, string> = {
  chores: 'Chores', errands: 'Errands', planning: 'Planning',
  admin: 'Admin', garden: 'Garden', other: 'Other',
}
const CATEGORY_ORDER: Category[] = ['chores', 'errands', 'planning', 'admin', 'garden', 'other']

type GroupBy = 'category' | 'entity'

interface SuggestionGroup {
  key: string
  label: string
  items: { suggestion: SuggestedTask; index: number }[]
}

interface Props {
  householdId: string
  currentUserId: string
  members: HouseholdMember[]
}

function buildCategoryGroups(suggestions: SuggestedTask[]): SuggestionGroup[] {
  return CATEGORY_ORDER
    .map(cat => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      items: suggestions
        .map((s, index) => ({ suggestion: s, index }))
        .filter(({ suggestion }) => suggestion.category === cat),
    }))
    .filter(g => g.items.length > 0)
}

function buildEntityGroups(suggestions: SuggestedTask[], profile: HouseholdProfile): SuggestionGroup[] {
  const kidNames = profile.kids.map(k => k.name ?? '').filter(Boolean)
  const petNames = profile.pets.map(p => p.name ?? '').filter(Boolean)
  const vehicleTokens = profile.vehicles.flatMap(v => [v.name ?? '', v.type].filter(Boolean))
  const familyNames = profile.family.map(f => f.name ?? '').filter(Boolean)

  const buckets: Record<string, SuggestionGroup> = {}
  const upsert = (key: string, label: string, suggestion: SuggestedTask, index: number) => {
    if (!buckets[key]) buckets[key] = { key, label, items: [] }
    buckets[key].items.push({ suggestion, index })
  }

  suggestions.forEach((s, index) => {
    const pl = (s.personLabel ?? '').toLowerCase()
    const text = `${s.title} ${pl}`.toLowerCase()

    const matchesKid  = kidNames.some(n => n.length >= 2 && text.includes(n.toLowerCase()))
    const matchesPet  = petNames.some(n => n.length >= 2 && text.includes(n.toLowerCase()))
    const matchesVeh  = vehicleTokens.some(n => n.length >= 2 && text.includes(n.toLowerCase()))
    const matchesFam  = familyNames.some(n => n.length >= 2 && text.includes(n.toLowerCase()))

    if (matchesKid && profile.kids.length > 0)         upsert('children', '👶 Children', s, index)
    else if (matchesPet && profile.pets.length > 0)    upsert('pets',     '🐾 Pets',     s, index)
    else if (matchesVeh && profile.vehicles.length > 0) upsert('vehicles', '🚗 Vehicles', s, index)
    else if (matchesFam && profile.family.length > 0)  upsert('family',   '👤 Family',   s, index)
    else                                                upsert('general',  'General',     s, index)
  })

  return Object.values(buckets)
}

export function AddTasksSection({ householdId, currentUserId, members }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [loadedProfile, setLoadedProfile] = useState<HouseholdProfile | null>(null)
  const [profileMembers, setProfileMembers] = useState<Profile[]>([])
  const [placeholderIds, setPlaceholderIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<Task[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [groupBy, setGroupBy] = useState<GroupBy>('category')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

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
      setLoadedProfile(profile)
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

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function advanceReview() {
    setReviewIndex(i => i + 1)
  }

  const reviewTask = reviewIndex < reviewQueue.length ? reviewQueue[reviewIndex] : null

  const groups: SuggestionGroup[] = loaded && suggestions.length > 0
    ? groupBy === 'category'
      ? buildCategoryGroups(suggestions)
      : buildEntityGroups(suggestions, loadedProfile!)
    : []

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

                {suggestions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-1 px-1">All suggested tasks for your household profile are already added.</p>
                ) : (
                  <>
                    {/* Group toggle */}
                    <div className="flex gap-1.5 items-center pt-1">
                      <span className="text-xs text-slate-400">Group:</span>
                      {(['category', 'entity'] as GroupBy[]).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGroupBy(g)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            groupBy === g ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {g === 'category' ? 'Category' : 'Household'}
                        </button>
                      ))}
                    </div>

                    {/* Grouped suggestion list */}
                    <div className="space-y-2">
                      {groups.map(group => {
                        const isCollapsed = collapsed.has(group.key)
                        return (
                          <div key={group.key} className="rounded-xl border border-slate-100 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.key)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                              <span className="text-xs font-semibold text-slate-600">{group.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{group.items.length}</span>
                                <ChevronDown
                                  size={14}
                                  className={`text-slate-400 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                                />
                              </div>
                            </button>
                            {!isCollapsed && (
                              <div className="px-2 pb-2 space-y-1.5 border-t border-slate-100">
                                {group.items.map(({ suggestion: s, index: i }) => {
                                  const on = selected.has(i)
                                  return (
                                    <div key={`${s.title}-${i}`} className="flex items-center gap-1.5">
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
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

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
