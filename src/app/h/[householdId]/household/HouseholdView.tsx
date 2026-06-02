'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'
import { MemberDetailModal } from '@/components/MemberDetailModal'
import { EntityDetailModal } from '@/components/EntityDetailModal'
import { TaskDetailModal } from '@/components/TaskDetailModal'
import { HouseholdProfileForm } from '../settings/HouseholdProfileForm'
import { AddTasksSection } from './AddTasksSection'
import type { Profile, Task, TaskCompletion, HouseholdMember, HouseholdProfile } from '@/lib/types'
import type { Entity } from '@/components/EntityDetailModal'

const supabase = createClient()

interface Props {
  householdId: string
  currentUserId: string
  members: HouseholdMember[]
  placeholders: { id: string; name: string }[]
  profile: HouseholdProfile
  tasks: Task[]
}

export function HouseholdView({ householdId, currentUserId, members, placeholders, profile, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [memberCompletions, setMemberCompletions] = useState<TaskCompletion[]>([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  async function handleMemberClick(profile: Profile) {
    setSelectedMember(profile)
    setMemberCompletions([])
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data } = await supabase
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at, is_pickup, task:tasks(title, effort)')
      .eq('completed_by', profile.id)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(20)
    setMemberCompletions((data ?? []) as unknown as TaskCompletion[])
  }

  const realProfiles = members.map(m => m.profile)
  const memberTaskCount = (profileId: string) =>
    tasks.filter(t => (t.owner_id ?? t.placeholder_owner_id) === profileId).length

  const { kids, pets, vehicles, family } = profile
  const hasEntities = kids.length > 0 || pets.length > 0 || vehicles.length > 0 || family.length > 0

  function entityLabel(e: Entity): string {
    switch (e.kind) {
      case 'kid': return e.data.name ?? 'Child'
      case 'pet': return e.data.name ?? (e.data.type[0].toUpperCase() + e.data.type.slice(1))
      case 'vehicle': return e.data.name ?? (e.data.type[0].toUpperCase() + e.data.type.slice(1))
      case 'family': return e.data.name ?? (e.data.role[0].toUpperCase() + e.data.role.slice(1))
    }
  }

  function entityIcon(e: Entity): string {
    switch (e.kind) {
      case 'kid': return '👶'
      case 'pet': return e.data.type === 'dog' ? '🐕' : e.data.type === 'cat' ? '🐈' : '🐾'
      case 'vehicle': return e.data.type === 'car' ? '🚗' : e.data.type === 'motorbike' ? '🏍️' : e.data.type === 'van' ? '🚐' : '🚌'
      case 'family': return '👤'
    }
  }

  return (
    <div className="space-y-5">
      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Members</h2>
        <div className="flex gap-3 flex-wrap">
          {realProfiles.map(p => {
            const taskCount = memberTaskCount(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleMemberClick(p)}
                className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:shadow-sm hover:border-indigo-200 transition-all"
              >
                <Avatar profile={p} size="md" className="w-12 h-12 text-lg" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{taskCount} task{taskCount === 1 ? '' : 's'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Household entities */}
      {hasEntities && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Household</h2>
          <div className="space-y-3">
            {kids.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Kids</p>
                <div className="flex gap-2 flex-wrap">
                  {kids.map((kid, i) => {
                    const e: Entity = { kind: 'kid', data: kid }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedEntity(e)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm hover:shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <span>{entityIcon(e)}</span>
                        <span className="font-medium text-slate-800">{entityLabel(e)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {pets.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Pets</p>
                <div className="flex gap-2 flex-wrap">
                  {pets.map((pet, i) => {
                    const e: Entity = { kind: 'pet', data: pet }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedEntity(e)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm hover:shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <span>{entityIcon(e)}</span>
                        <span className="font-medium text-slate-800">{entityLabel(e)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {vehicles.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Vehicles</p>
                <div className="flex gap-2 flex-wrap">
                  {vehicles.map((v, i) => {
                    const e: Entity = { kind: 'vehicle', data: v }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedEntity(e)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm hover:shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <span>{entityIcon(e)}</span>
                        <span className="font-medium text-slate-800">{entityLabel(e)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {family.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Family</p>
                <div className="flex gap-2 flex-wrap">
                  {family.map((fm, i) => {
                    const e: Entity = { kind: 'family', data: fm }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedEntity(e)}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm hover:shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <span>{entityIcon(e)}</span>
                        <span className="font-medium text-slate-800">{entityLabel(e)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Profile editing */}
      <HouseholdProfileForm
        householdId={householdId}
        initialProfile={profile}
        members={members}
        placeholders={placeholders}
      />

      {/* Add tasks */}
      <AddTasksSection
        householdId={householdId}
        currentUserId={currentUserId}
        members={members}
      />

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          tasks={tasks.filter(t => (t.owner_id ?? t.placeholder_owner_id) === selectedMember.id)}
          score={undefined}
          completions={memberCompletions}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {selectedEntity && (
        <EntityDetailModal
          entity={selectedEntity}
          tasks={tasks}
          onClose={() => setSelectedEntity(null)}
          onTaskClick={task => { setEditingTask(task) }}
        />
      )}

      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          members={[...members.map(m => m.profile)]}
          householdId={householdId}
          currentUserId={currentUserId}
          onClose={() => setEditingTask(null)}
          onUpdate={updated => {
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
            setEditingTask(updated)
          }}
          onDelete={id => {
            setTasks(prev => prev.filter(t => t.id !== id))
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
