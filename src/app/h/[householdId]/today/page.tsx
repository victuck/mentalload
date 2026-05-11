import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TodayView } from './TodayView'

export default async function TodayPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .or(`and(frequency.neq.one-off,next_due_date.lte.${today}),frequency.eq.one-off`)
      .order('created_at'),
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
  const profiles = (members ?? []).map(m => m.profile as unknown as import('@/lib/types').Profile)

  return (
    <TodayView
      householdId={householdId}
      currentUserId={user.id}
      members={profiles}
      tasks={dueTasks}
    />
  )
}
