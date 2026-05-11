import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — check .env.local')
}

export const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function cleanupTestHousehold(householdId: string) {
  const { data: tasks, error: tasksErr } = await testSupabase.from('tasks').select('id').eq('household_id', householdId)
  if (tasksErr) console.error(`[cleanup] failed to fetch tasks for ${householdId}:`, tasksErr.message)
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id)
    const { error: compErr } = await testSupabase.from('task_completions').delete().in('task_id', taskIds)
    if (compErr) console.error(`[cleanup] failed to delete completions for ${householdId}:`, compErr.message)
  }
  const steps: Array<{ table: string; filter: [string, string] }> = [
    { table: 'tasks', filter: ['household_id', householdId] },
    { table: 'household_members', filter: ['household_id', householdId] },
    { table: 'invites', filter: ['household_id', householdId] },
    { table: 'households', filter: ['id', householdId] },
  ]
  for (const { table, filter } of steps) {
    const { error } = await testSupabase.from(table).delete().eq(filter[0], filter[1])
    if (error) console.error(`[cleanup] failed to delete from ${table} for ${householdId}:`, error.message)
  }
}
