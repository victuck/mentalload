import { createClient } from '@supabase/supabase-js'

export const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function cleanupTestHousehold(householdId: string) {
  const { data: tasks } = await testSupabase.from('tasks').select('id').eq('household_id', householdId)
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id)
    await testSupabase.from('task_completions').delete().in('task_id', taskIds)
  }
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('household_members').delete().eq('household_id', householdId)
  await testSupabase.from('invites').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
}
