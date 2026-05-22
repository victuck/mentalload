import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Category, Effort, Frequency } from '@/lib/types'

const VALID_CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'garden', 'other']
const VALID_FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom']
const VALID_EFFORTS: Effort[] = ['low', 'medium', 'high']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    title: string
    owner_id: string | null
    placeholder_owner_id?: string | null
    category: Category
    frequency: Frequency
    custom_frequency_label?: string
    custom_frequency_weight?: number
    next_due_date?: string
    effort: Effort
    is_invisible_work: boolean
  }

  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!VALID_CATEGORIES.includes(body.category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!VALID_FREQUENCIES.includes(body.frequency)) return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
  if (!VALID_EFFORTS.includes(body.effort)) return NextResponse.json({ error: 'Invalid effort' }, { status: 400 })

  const { data, error } = await supabase.from('tasks').insert({
    household_id: householdId,
    title: body.title.trim(),
    owner_id: body.owner_id,
    placeholder_owner_id: body.placeholder_owner_id ?? null,
    category: body.category,
    frequency: body.frequency,
    custom_frequency_label: body.frequency === 'custom' ? (body.custom_frequency_label ?? null) : null,
    custom_frequency_weight: body.frequency === 'custom' ? (body.custom_frequency_weight ?? null) : null,
    next_due_date: body.next_due_date ?? new Date().toISOString().slice(0, 10),
    effort: body.effort,
    is_invisible_work: body.is_invisible_work,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id: string; snooze?: boolean } & Partial<{
    title: string; owner_id: string | null; category: Category; frequency: Frequency
    custom_frequency_label: string; custom_frequency_weight: number
    next_due_date: string; effort: Effort; is_invisible_work: boolean
  }>

  if (!body.id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })

  // Explicit allowlist — prevents clients from overwriting created_by, household_id, etc.
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.owner_id !== undefined) updates.owner_id = body.owner_id
  if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) updates.category = body.category
  if (body.frequency !== undefined && VALID_FREQUENCIES.includes(body.frequency)) updates.frequency = body.frequency
  if (body.effort !== undefined && VALID_EFFORTS.includes(body.effort)) updates.effort = body.effort
  if (body.is_invisible_work !== undefined) updates.is_invisible_work = body.is_invisible_work
  if (body.next_due_date !== undefined) updates.next_due_date = body.next_due_date
  if (body.custom_frequency_label !== undefined) updates.custom_frequency_label = body.custom_frequency_label
  if (body.custom_frequency_weight !== undefined) updates.custom_frequency_weight = body.custom_frequency_weight

  if (body.snooze) {
    const { data: current } = await supabase.from('tasks').select('snooze_count').eq('id', body.id).single()
    updates.snooze_count = (current?.snooze_count ?? 0) + 1
  }

  const { data, error } = await supabase.from('tasks')
    .update(updates)
    .eq('id', body.id)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })

  const { error } = await supabase.from('tasks')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
