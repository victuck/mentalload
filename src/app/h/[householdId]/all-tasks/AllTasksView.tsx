'use client'

import { useState } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { Task, Profile, Category, HouseholdProfile } from '@/lib/types'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { TaskForm } from '@/components/TaskForm'
import { Avatar } from '@/components/Avatar'

const CATEGORY_STYLES: Record<Category, string> = {
  chores:   'bg-peach text-slate-800',
  planning: 'bg-slate-200 text-slate-700',
  errands:  'bg-sand text-slate-800',
  admin:    'bg-indigo-100 text-indigo-800',
  garden:   'bg-green-100 text-green-800',
  other:    'bg-slate-100 text-slate-600',
}

const CATEGORY_LABELS: Record<Category, string> = {
  chores: 'Chores', errands: 'Errands', planning: 'Planning',
  admin: 'Admin', garden: 'Garden', other: 'Other',
}

const EFFORT_STYLES = {
  low:    'text-green-600',
  medium: 'text-amber-500',
  high:   'text-rose-600',
}

const FREQ_LABEL: Record<string, string> = {
  'one-off': 'One-off', daily: 'Daily', weekly: 'Weekly',
  fortnightly: 'Fortnightly', monthly: 'Monthly',
  quarterly: 'Quarterly', annual: 'Annual', custom: 'Custom',
}

const CATEGORY_ORDER: Category[] = ['chores', 'errands', 'planning', 'admin', 'garden', 'other']

type GroupBy = 'category' | 'entity'
type SortBy = 'due' | 'effort' | 'owner'
const EFFORT_ORDER = { high: 0, medium: 1, low: 2 }

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  placeholderMemberIds: string[]
  tasks: Task[]
  householdProfile: HouseholdProfile
}

interface TaskGroup {
  key: string
  label: string
  badge?: string
  badgeStyle?: string
  tasks: Task[]
}

function sortTasks(tasks: Task[], sortBy: SortBy, members: Profile[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (sortBy === 'due') {
      if (!a.next_due_date && !b.next_due_date) return 0
      if (!a.next_due_date) return 1
      if (!b.next_due_date) return -1
      return a.next_due_date.localeCompare(b.next_due_date)
    }
    if (sortBy === 'effort') return EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort]
    if (sortBy === 'owner') {
      const nameA = members.find(m => m.id === (a.owner_id ?? a.placeholder_owner_id))?.name ?? 'ZZZ'
      const nameB = members.find(m => m.id === (b.owner_id ?? b.placeholder_owner_id))?.name ?? 'ZZZ'
      return nameA.localeCompare(nameB)
    }
    return 0
  })
}

function buildEntityGroups(tasks: Task[], profile: HouseholdProfile): TaskGroup[] {
  const entityBuckets: { key: string; label: string; icon: string; names: string[] }[] = []

  if (profile.kids.length > 0) {
    entityBuckets.push({
      key: 'children',
      label: 'Children',
      icon: '👶',
      names: profile.kids.map(k => k.name ?? '').filter(Boolean),
    })
  }
  if (profile.pets.length > 0) {
    entityBuckets.push({
      key: 'pets',
      label: 'Pets',
      icon: '🐾',
      names: profile.pets.map(p => p.name ?? '').filter(Boolean),
    })
  }
  if (profile.vehicles.length > 0) {
    entityBuckets.push({
      key: 'vehicles',
      label: 'Vehicles',
      icon: '🚗',
      names: profile.vehicles.map(v => v.name ?? '').filter(Boolean),
    })
  }
  if (profile.family.length > 0) {
    entityBuckets.push({
      key: 'family',
      label: 'Family',
      icon: '👤',
      names: profile.family.map(f => f.name ?? '').filter(Boolean),
    })
  }

  const assigned = new Set<string>()
  const groups: TaskGroup[] = entityBuckets.map(bucket => {
    const matched = tasks.filter(t => {
      if (bucket.names.length === 0) return false
      const text = `${t.title} ${t.notes ?? ''}`.toLowerCase()
      return bucket.names.some(n => n.length >= 2 && text.includes(n.toLowerCase()))
    })
    matched.forEach(t => assigned.add(t.id))
    return {
      key: bucket.key,
      label: `${bucket.icon} ${bucket.label}`,
      tasks: matched,
    }
  }).filter(g => g.tasks.length > 0)

  const general = tasks.filter(t => !assigned.has(t.id))
  if (general.length > 0) {
    groups.push({ key: 'general', label: 'General', tasks: general })
  }

  return groups
}

export function AllTasksView({ householdId, currentUserId, members, placeholderMemberIds, tasks: initialTasks, householdProfile }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterMember, setFilterMember] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('due')
  const [groupBy, setGroupBy] = useState<GroupBy>('category')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = sortTasks(
    tasks.filter(t => {
      if (filterMember === 'all') return true
      if (filterMember === 'unassigned') return t.owner_id === null && t.placeholder_owner_id === null && !t.is_shared
      if (filterMember === 'shared') return t.is_shared
      return (t.owner_id ?? t.placeholder_owner_id) === filterMember
    }),
    sortBy,
    members,
  )

  const groups: TaskGroup[] = groupBy === 'category'
    ? CATEGORY_ORDER
        .map(cat => ({
          key: cat,
          label: CATEGORY_LABELS[cat],
          badge: CATEGORY_LABELS[cat],
          badgeStyle: CATEGORY_STYLES[cat],
          tasks: filtered.filter(t => t.category === cat),
        }))
        .filter(g => g.tasks.length > 0)
    : buildEntityGroups(filtered, householdProfile)

  function handleUpdate(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTask(null)
  }

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const TODAY = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 text-lg">
          All tasks <span className="text-slate-400 font-normal text-base">({tasks.length})</span>
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 self-center mr-0.5">Owner:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'unassigned', label: 'Unassigned' },
            { id: 'shared', label: 'Shared' },
            ...members.map(m => ({ id: m.id, label: m.name })),
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterMember(opt.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                filterMember === opt.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 self-center mr-0.5">Group:</span>
          <button
            onClick={() => setGroupBy('category')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              groupBy === 'category' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Category
          </button>
          <button
            onClick={() => setGroupBy('entity')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              groupBy === 'entity' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Household
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 self-center mr-0.5">Sort:</span>
          {([['due', 'Due date'], ['effort', 'Effort'], ['owner', 'Owner']] as [SortBy, string][]).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                sortBy === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No tasks match these filters.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ key, label, badge, badgeStyle, tasks: groupTasks }) => {
            const isCollapsed = collapsed.has(key)
            return (
              <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {badge && badgeStyle
                      ? <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${badgeStyle}`}>{badge}</span>
                      : <span className="text-sm font-semibold text-slate-700">{label}</span>
                    }
                    <span className="text-xs text-slate-400">{groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {groupTasks.map(task => {
                      const owner = members.find(m => m.id === (task.owner_id ?? task.placeholder_owner_id))
                      const isOverdue = task.next_due_date && task.next_due_date < TODAY
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
                        >
                          {owner
                            ? <Avatar profile={owner} size="xs" className="shrink-0" />
                            : <span className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize ${CATEGORY_STYLES[task.category]}`}>
                                {task.category}
                              </span>
                              <span className={`text-xs font-medium capitalize ${EFFORT_STYLES[task.effort]}`}>
                                {task.effort}
                              </span>
                              <span className="text-xs text-slate-400">
                                {task.custom_frequency_label ?? FREQ_LABEL[task.frequency]}
                              </span>
                              {task.is_shared && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-slate-100 text-slate-500">Shared</span>
                              )}
                            </div>
                          </div>
                          {task.next_due_date && (
                            <span className={`text-xs font-medium shrink-0 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                              {formatDate(task.next_due_date)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={members}
          householdId={householdId}
          currentUserId={currentUserId}
          placeholderMemberIds={placeholderMemberIds}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <TaskForm
          householdId={householdId}
          members={members.filter(m => !placeholderMemberIds.includes(m.id))}
          placeholderMemberIds={placeholderMemberIds}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
