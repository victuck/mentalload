import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a member of this household
  const { data: member } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete in dependency order — tasks first, then household (cascades members/placeholders if FK set)
  await supabase.from('task_completions').delete().in(
    'task_id',
    (await supabase.from('tasks').select('id').eq('household_id', householdId)).data?.map(t => t.id) ?? []
  )
  await supabase.from('tasks').delete().eq('household_id', householdId)
  await supabase.from('household_members').delete().eq('household_id', householdId)
  await supabase.from('placeholder_members').delete().eq('household_id', householdId)
  await supabase.from('invites').delete().eq('household_id', householdId)
  const { error } = await supabase.from('households').delete().eq('id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
