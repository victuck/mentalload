import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BalanceView } from './BalanceView'

export default async function BalancePage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  // Fetch members and tasks first — task IDs are used to scope the completions query
  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId),
  ])

  // Filter completions by task IDs (avoids unreliable join-based filtering across households)
  const taskIds = (tasks ?? []).map(t => t.id)
  const { data: completions } = taskIds.length > 0
    ? await supabase
        .from('task_completions')
        .select('id, task_id, completed_by, completed_at, is_pickup')
        .in('task_id', taskIds)
        .eq('is_pickup', true)
        .gte('completed_at', yearAgo.toISOString())
    : { data: [] }

  const profiles = (members ?? []).map(m => m.profile as unknown as { id: string; name: string; avatar_colour: string; created_at: string })

  return (
    <BalanceView
      householdId={householdId}
      members={profiles}
      tasks={tasks ?? []}
      completions={completions ?? []}
    />
  )
}
