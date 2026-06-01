import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNextDueDate } from '@/lib/balance'
import type { Frequency } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id } = await request.json() as { task_id: string }
  if (!task_id) return NextResponse.json({ error: 'task_id is required' }, { status: 400 })

  const { data: task } = await supabase
    .from('tasks')
    .select('owner_id, frequency, next_due_date, is_shared, current_turn_user_id')
    .eq('id', task_id)
    .eq('household_id', householdId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const is_pickup = task.owner_id !== null && task.owner_id !== user.id

  await supabase.from('task_completions').insert({ task_id, completed_by: user.id, is_pickup })

  // Flip turn for shared tasks when the current turn-holder completes it
  if (task.is_shared) {
    const shouldFlip = task.current_turn_user_id === user.id || task.current_turn_user_id === null
    if (shouldFlip) {
      const { data: others } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .neq('user_id', user.id)
      const otherUserId = others?.[0]?.user_id ?? null
      if (otherUserId) {
        await supabase.from('tasks').update({ current_turn_user_id: otherUserId }).eq('id', task_id)
      }
    }
  }

  // Advance next_due_date for recurring tasks (not one-off or custom)
  if (task.frequency !== 'one-off' && task.frequency !== 'custom' && task.next_due_date) {
    const next = getNextDueDate(task.frequency as Frequency, new Date(task.next_due_date))
    if (next) {
      await supabase.from('tasks').update({ next_due_date: next.toISOString().slice(0, 10) }).eq('id', task_id)
    }
  }

  return NextResponse.json({ ok: true })
}
