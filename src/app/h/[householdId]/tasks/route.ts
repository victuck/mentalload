import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Category, Effort, Frequency } from '@/lib/types'

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
    category: Category
    frequency: Frequency
    custom_frequency_label?: string
    custom_frequency_weight?: number
    next_due_date?: string
    effort: Effort
    is_invisible_work: boolean
  }

  const { data, error } = await supabase.from('tasks').insert({
    household_id: householdId,
    title: body.title,
    owner_id: body.owner_id,
    category: body.category,
    frequency: body.frequency,
    custom_frequency_label: body.custom_frequency_label ?? null,
    custom_frequency_weight: body.custom_frequency_weight ?? null,
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

  const body = await request.json() as { id: string } & Partial<{
    title: string; owner_id: string | null; category: Category; frequency: Frequency
    custom_frequency_label: string; custom_frequency_weight: number
    next_due_date: string; effort: Effort; is_invisible_work: boolean
  }>

  const { id, ...updates } = body

  const { data, error } = await supabase.from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
