import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a member and collect all member user IDs
  const { data: householdMembers, error: membersError } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })
  if (!householdMembers?.some(m => m.user_id === user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const memberUserIds = householdMembers.map(m => m.user_id as string)
  const admin = createAdminClient()

  // Delete task completions first (FK dependency)
  const { data: taskIds } = await admin.from('tasks').select('id').eq('household_id', householdId)
  if (taskIds && taskIds.length > 0) {
    const { error: e } = await admin.from('task_completions').delete().in('task_id', taskIds.map(t => t.id))
    if (e) return NextResponse.json({ error: `task_completions: ${e.message}` }, { status: 500 })
  }

  const { error: e1 } = await admin.from('tasks').delete().eq('household_id', householdId)
  if (e1) return NextResponse.json({ error: `tasks: ${e1.message}` }, { status: 500 })

  const { error: e2 } = await admin.from('household_members').delete().eq('household_id', householdId)
  if (e2) return NextResponse.json({ error: `household_members: ${e2.message}` }, { status: 500 })

  const { error: e3 } = await admin.from('placeholder_members').delete().eq('household_id', householdId)
  if (e3) return NextResponse.json({ error: `placeholder_members: ${e3.message}` }, { status: 500 })

  const { error: e4 } = await admin.from('invites').delete().eq('household_id', householdId)
  if (e4) return NextResponse.json({ error: `invites: ${e4.message}` }, { status: 500 })

  const { error: e5 } = await admin.from('households').delete().eq('id', householdId)
  if (e5) return NextResponse.json({ error: `households: ${e5.message}` }, { status: 500 })

  // Delete profiles
  if (memberUserIds.length > 0) {
    const { error: e6 } = await admin.from('profiles').delete().in('id', memberUserIds)
    if (e6) return NextResponse.json({ error: `profiles: ${e6.message}` }, { status: 500 })
  }

  // Delete auth users so they are fully removed from the system
  for (const uid of memberUserIds) {
    await admin.auth.admin.deleteUser(uid)
  }

  return NextResponse.json({ ok: true })
}
