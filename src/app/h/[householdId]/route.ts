import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a member of this household and collect all member user IDs
  const { data: householdMembers } = await admin
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (!householdMembers?.some(m => m.user_id === user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const memberUserIds = householdMembers.map(m => m.user_id as string)

  // Delete task completions first (FK dependency)
  const { data: taskIds } = await admin.from('tasks').select('id').eq('household_id', householdId)
  if (taskIds && taskIds.length > 0) {
    await admin.from('task_completions').delete().in('task_id', taskIds.map(t => t.id))
  }

  // Delete all household data in dependency order
  await admin.from('tasks').delete().eq('household_id', householdId)
  await admin.from('household_members').delete().eq('household_id', householdId)
  await admin.from('placeholder_members').delete().eq('household_id', householdId)
  await admin.from('invites').delete().eq('household_id', householdId)
  await admin.from('households').delete().eq('id', householdId)

  // Delete profiles for all members so they re-enter the new household journey on next login
  if (memberUserIds.length > 0) {
    await admin.from('profiles').delete().in('id', memberUserIds)
  }

  return NextResponse.json({ ok: true })
}
