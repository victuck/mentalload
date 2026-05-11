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

  const [{ data: members }, { data: tasks }, { data: completions }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId),
    supabase
      .from('task_completions')
      .select('*, task:tasks(effort, household_id)')
      .eq('task.household_id', householdId)
      .eq('is_pickup', true)
      .gte('completed_at', yearAgo.toISOString()),
  ])

  const profiles = (members ?? []).map(m => m.profile as unknown as { id: string; name: string; avatar_colour: string; created_at: string })

  return (
    <BalanceView
      householdId={householdId}
      currentUserId={user.id}
      members={profiles}
      tasks={tasks ?? []}
      completions={completions ?? []}
    />
  )
}
