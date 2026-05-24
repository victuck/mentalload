import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TodayView } from './TodayView'

export default async function TodayPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const horizonEnd = new Date()
  horizonEnd.setDate(horizonEnd.getDate() + 29)
  const horizonEndStr = horizonEnd.toISOString().slice(0, 10)

  const [{ data: members }, { data: placeholders }, { data: tasks }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('placeholder_members')
      .select('id, name, avatar_colour')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .or(`frequency.eq.one-off,next_due_date.is.null,next_due_date.lte.${horizonEndStr}`)
      .order('next_due_date'),
  ])

  // Filter out completed one-off tasks
  const oneOffIds = (tasks ?? []).filter(t => t.frequency === 'one-off').map(t => t.id)
  const completedSet = new Set<string>()
  if (oneOffIds.length > 0) {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('task_id')
      .in('task_id', oneOffIds)
    for (const c of completions ?? []) completedSet.add(c.task_id)
  }

  const dueTasks = (tasks ?? []).filter(t => t.frequency !== 'one-off' || !completedSet.has(t.id))
  const realProfiles = (members ?? []).map(m => m.profile as unknown as import('@/lib/types').Profile)
  const placeholderProfiles = (placeholders ?? []).map(p => ({ id: p.id, name: p.name, avatar_colour: p.avatar_colour, avatar_url: null, created_at: '' }) as import('@/lib/types').Profile)
  const profiles = [...realProfiles, ...placeholderProfiles]
  const placeholderMemberIds = (placeholders ?? []).map(p => p.id)

  // Fetch tasks completed today to pre-populate the completed list
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: todayCompletions } = await supabase
    .from('task_completions')
    .select('task_id')
    .gte('completed_at', todayStart.toISOString())

  let completedTasks: import('@/lib/types').Task[] = []
  const completedTodayIds = [...new Set((todayCompletions ?? []).map(c => c.task_id))]
  if (completedTodayIds.length > 0) {
    const { data: completedTaskRows } = await supabase
      .from('tasks')
      .select('*')
      .in('id', completedTodayIds)
      .eq('household_id', householdId)
    completedTasks = completedTaskRows ?? []
  }

  return (
    <TodayView
      householdId={householdId}
      currentUserId={user.id}
      members={profiles}
      placeholderMemberIds={placeholderMemberIds}
      tasks={dueTasks}
      initialCompletedTasks={completedTasks}
    />
  )
}
