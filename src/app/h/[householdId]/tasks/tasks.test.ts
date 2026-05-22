import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
let householdId: string

beforeAll(async () => {
  const { data: hh } = await testSupabase.from('households').insert({ name: 'Task CRUD Test' }).select().single()
  householdId = hh!.id
})

afterAll(async () => {
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
})

describe('POST /h/[householdId]/tasks', () => {
  it('creates an unassigned task', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Test task', owner_id: null, category: 'chores',
        frequency: 'weekly', effort: 'medium', is_invisible_work: false,
        next_due_date: '2026-05-11',
      }),
    })
    expect(res.ok).toBe(true)
    const task = await res.json()
    expect(task.owner_id).toBeNull()
    expect(task.household_id).toBe(householdId)
  })

  it('creates a custom frequency task with weight and label', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'School term task', owner_id: null, category: 'planning',
        frequency: 'custom', custom_frequency_label: 'Each term',
        custom_frequency_weight: 3, effort: 'high',
        is_invisible_work: true, next_due_date: '2026-09-01',
      }),
    })
    const task = await res.json()
    expect(task.custom_frequency_weight).toBe(3)
    expect(task.custom_frequency_label).toBe('Each term')
    expect(task.is_invisible_work).toBe(true)
  })

  it('returns 401 for unauthenticated requests', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x', owner_id: null, category: 'chores', frequency: 'weekly', effort: 'low', is_invisible_work: false }),
    })
    expect(res.status).toBe(401)
  })

  it('stores placeholder_owner_id when provided', async () => {
    const placeholderId = '00000000-0000-0000-0000-000000000001'
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Partner task',
        owner_id: null,
        placeholder_owner_id: placeholderId,
        category: 'chores',
        frequency: 'weekly',
        effort: 'medium',
        is_invisible_work: false,
        next_due_date: '2026-05-22',
      }),
    })
    expect(res.ok).toBe(true)
    const task = await res.json()
    expect(task.owner_id).toBeNull()
    expect(task.placeholder_owner_id).toBe(placeholderId)
  })
})

describe('PATCH /h/[householdId]/tasks', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'fake-id', owner_id: null }),
    })
    expect(res.status).toBe(401)
  })

  it('assigns a previously unassigned task to an owner', async () => {
    const { data: task } = await testSupabase.from('tasks').insert({
      household_id: householdId, title: 'Unassigned', owner_id: null,
      category: 'errands', frequency: 'weekly', effort: 'low',
      is_invisible_work: false, next_due_date: '2026-05-11',
    }).select().single()

    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: task!.id, owner_id: 'some-user-id' }),
    })
    expect(res.ok).toBe(true)
    const updated = await res.json()
    expect(updated.owner_id).toBe('some-user-id')
  })
})

describe('PATCH /h/[householdId]/tasks — claim_placeholder', () => {
  it('reassigns placeholder tasks to the authenticated user and deletes the placeholder', async () => {
    // Insert placeholder directly (bypassing RLS)
    const { data: ph } = await testSupabase
      .from('placeholder_members')
      .insert({ household_id: householdId, name: 'Jamie', avatar_colour: '#ec4899' })
      .select()
      .single()
    const placeholderId = ph!.id

    // Insert a task attributed to the placeholder
    const { data: task } = await testSupabase.from('tasks').insert({
      household_id: householdId,
      title: 'Partner placeholder task',
      owner_id: null,
      placeholder_owner_id: placeholderId,
      category: 'chores',
      frequency: 'weekly',
      effort: 'low',
      is_invisible_work: false,
      next_due_date: '2026-05-22',
    }).select().single()

    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'claim_placeholder', placeholder_id: placeholderId }),
    })
    expect(res.ok).toBe(true)

    // Task should now be owned by the real user, placeholder_owner_id cleared
    const { data: updated } = await testSupabase.from('tasks').select('owner_id, placeholder_owner_id').eq('id', task!.id).single()
    expect(updated!.owner_id).not.toBeNull()
    expect(updated!.placeholder_owner_id).toBeNull()

    // Placeholder row should be gone
    const { data: gone } = await testSupabase.from('placeholder_members').select('id').eq('id', placeholderId).maybeSingle()
    expect(gone).toBeNull()
  })
})
