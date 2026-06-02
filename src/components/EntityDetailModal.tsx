'use client'

import { X } from 'lucide-react'
import type { Task, HouseholdProfile } from '@/lib/types'

type Kid = HouseholdProfile['kids'][0]
type Pet = HouseholdProfile['pets'][0]
type Vehicle = HouseholdProfile['vehicles'][0]
type FamilyMember = HouseholdProfile['family'][0]

export type Entity =
  | { kind: 'kid'; data: Kid }
  | { kind: 'pet'; data: Pet }
  | { kind: 'vehicle'; data: Vehicle }
  | { kind: 'family'; data: FamilyMember }

interface Props {
  entity: Entity
  tasks: Task[]
  onClose: () => void
  onTaskClick?: (task: Task) => void
}

const CATEGORY_STYLES: Record<string, string> = {
  chores:   'bg-peach text-slate-800',
  planning: 'bg-slate-200 text-slate-700',
  errands:  'bg-sand text-slate-800',
  admin:    'bg-indigo-100 text-indigo-800',
  garden:   'bg-green-100 text-green-800',
  other:    'bg-slate-100 text-slate-600',
}

function calcAge(birthday: string): number | null {
  const birth = new Date(birthday)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function entityName(entity: Entity): string | null {
  switch (entity.kind) {
    case 'kid': return entity.data.name ?? null
    case 'pet': return entity.data.name ?? null
    case 'vehicle': return entity.data.name ?? null
    case 'family': return entity.data.name ?? null
  }
}

function entityLabel(entity: Entity): string {
  switch (entity.kind) {
    case 'kid': return entity.data.name ?? 'Child'
    case 'pet': return entity.data.name ?? (entity.data.type[0].toUpperCase() + entity.data.type.slice(1))
    case 'vehicle': return entity.data.name ?? (entity.data.type[0].toUpperCase() + entity.data.type.slice(1))
    case 'family': return entity.data.name ?? (entity.data.role[0].toUpperCase() + entity.data.role.slice(1))
  }
}

function entityIcon(entity: Entity): string {
  switch (entity.kind) {
    case 'kid': return '👶'
    case 'pet': return entity.data.type === 'dog' ? '🐕' : entity.data.type === 'cat' ? '🐈' : '🐾'
    case 'vehicle': return entity.data.type === 'car' ? '🚗' : entity.data.type === 'motorbike' ? '🏍️' : entity.data.type === 'van' ? '🚐' : '🚌'
    case 'family': return '👤'
  }
}

function entityDetails(entity: Entity): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = []
  switch (entity.kind) {
    case 'kid': {
      const d = entity.data
      if (d.birthday) {
        const age = calcAge(d.birthday)
        if (age !== null) details.push({ label: 'Age', value: `${age}` })
        details.push({ label: 'Birthday', value: new Date(d.birthday + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) })
      }
      if (d.has_health_needs) details.push({ label: 'Health needs', value: 'Yes' })
      break
    }
    case 'pet': {
      const d = entity.data
      details.push({ label: 'Type', value: d.type[0].toUpperCase() + d.type.slice(1) })
      break
    }
    case 'vehicle': {
      const d = entity.data
      details.push({ label: 'Type', value: d.type[0].toUpperCase() + d.type.slice(1) })
      break
    }
    case 'family': {
      const d = entity.data
      details.push({ label: 'Role', value: d.role[0].toUpperCase() + d.role.slice(1) })
      if (d.birthday) {
        const age = calcAge(d.birthday)
        if (age !== null) details.push({ label: 'Age', value: `${age}` })
      }
      if (d.notes) details.push({ label: 'Notes', value: d.notes })
      if (d.has_health_needs) details.push({ label: 'Health needs', value: 'Yes' })
      break
    }
  }
  return details
}

function relatedTasks(entity: Entity, tasks: Task[]): Task[] {
  const name = entityName(entity)
  if (!name || name.trim().length < 2) return []
  const lower = name.toLowerCase()
  return tasks.filter(t =>
    t.title.toLowerCase().includes(lower) ||
    (t.notes ?? '').toLowerCase().includes(lower)
  )
}

export function EntityDetailModal({ entity, tasks, onClose, onTaskClick }: Props) {
  const label = entityLabel(entity)
  const icon = entityIcon(entity)
  const details = entityDetails(entity)
  const matched = relatedTasks(entity, tasks)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {details.length > 0 && (
            <div className="px-6 py-5 space-y-2">
              {details.map(d => (
                <div key={d.label} className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-slate-400 w-24 shrink-0">{d.label}</span>
                  <span className="text-sm text-slate-700">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className={`px-6 py-5 ${details.length > 0 ? 'border-t border-slate-100' : ''}`}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Related tasks <span className="text-slate-400 font-normal">({matched.length})</span>
            </h3>
            {matched.length === 0 ? (
              <p className="text-sm text-slate-400">
                {entityName(entity)
                  ? `No tasks found mentioning "${entityName(entity)}".`
                  : 'Add a name to match tasks automatically.'}
              </p>
            ) : (
              <ul className="space-y-0">
                {matched.map(t => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(t)}
                      className="w-full flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
                    >
                      <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{t.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize shrink-0 ${CATEGORY_STYLES[t.category]}`}>
                        {t.category}
                      </span>
                    </button>
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
