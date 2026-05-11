import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
let householdId: string
let taskId: string

beforeAll(async () => {
  const { data: hh } = await testSupabase.from('households').insert({ name: 'Complete Test' }).select().single()
  householdId = hh!.id
})

afterAll(async () => {
  if (taskId) await testSupabase.from('task_completions').delete().eq('task_id', taskId)
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
})

async function createTask(overrides = {}) {
  const { data } = await testSupabase.from('tasks').insert({
    household_id: householdId, title: 'Test', owner_id: null,
    category: 'chores', frequency: 'weekly', effort: 'medium',
    is_invisible_work: false, next_due_date: '2026-05-11',
    ...overrides,
  }).select().single()
  return data!
}

describe('POST /h/[householdId]/tasks/complete', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const task = await createTask()
    taskId = task.id
    const res = await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id }),
    })
    expect(res.status).toBe(401)
  })

  it('advances next_due_date by 7 days for a weekly task', async () => {
    const task = await createTask({ frequency: 'weekly', next_due_date: '2026-05-11' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBe('2026-05-18')
  })

  it('does not advance next_due_date for one-off tasks', async () => {
    const task = await createTask({ frequency: 'one-off', next_due_date: null })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBeNull()
  })

  it('does not advance next_due_date for custom tasks', async () => {
    const task = await createTask({ frequency: 'custom', custom_frequency_weight: 3, next_due_date: '2026-09-01' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBe('2026-09-01')
  })

  it('sets is_pickup = true when completer is not the owner', async () => {
    const task = await createTask({ owner_id: '00000000-0000-0000-0000-000000000001' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: completion } = await testSupabase
      .from('task_completions').select('is_pickup').eq('task_id', task.id).single()
    expect(completion!.is_pickup).toBe(true)
  })
})
