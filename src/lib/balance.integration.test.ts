import { describe, it, expect, afterEach } from 'vitest'
import { testSupabase, cleanupTestHousehold } from '../test-utils/supabase'
import { calculateBalanceScores } from './balance'
import type { Task, TaskCompletion, Profile } from './types'

describe('balance integration tests', () => {
  const householdIds: string[] = []

  afterEach(async () => {
    for (const id of householdIds) {
      await cleanupTestHousehold(id)
    }
    householdIds.length = 0
  })

  it('creates a household and tasks, returns empty scores with no members', async () => {
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Integration Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    expect(household).not.toBeNull()
    householdIds.push(household!.id)

    const today = new Date().toISOString().slice(0, 10)

    const { data: tasks, error: tasksError } = await testSupabase
      .from('tasks')
      .insert([
        { household_id: household!.id, title: 'Daily chore', owner_id: null, category: 'chores',
          frequency: 'daily', effort: 'medium', is_invisible_work: false, next_due_date: today },
        { household_id: household!.id, title: 'Weekly errand', owner_id: null, category: 'errands',
          frequency: 'weekly', effort: 'low', is_invisible_work: false, next_due_date: today },
      ])
      .select()

    expect(tasksError).toBeNull()
    expect(tasks).toHaveLength(2)

    const scores = calculateBalanceScores([], tasks as Task[], [])
    expect(scores).toEqual([])
  })

  it('pickup completions affect balance scores', async () => {
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Pickup Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    householdIds.push(household!.id)

    const { data: tasks, error: tasksError } = await testSupabase
      .from('tasks')
      .insert([{
        household_id: household!.id, title: 'Weekly high effort task', owner_id: null,
        category: 'planning', frequency: 'weekly', effort: 'high', is_invisible_work: false,
        next_due_date: new Date().toISOString().slice(0, 10),
      }])
      .select()

    expect(tasksError).toBeNull()
    const theTask = tasks![0] as Task

    const fakeUserId = crypto.randomUUID()
    const fakeProfile: Profile = {
      id: fakeUserId, name: 'Test User', avatar_colour: '#6366f1',
      created_at: new Date().toISOString(),
    }

    // Completion is in-memory only — calculateBalanceScores works on passed-in data,
    // not by reading from the DB. The task field must be populated for pickup score.
    const completion: TaskCompletion = {
      id: crypto.randomUUID(), task_id: theTask.id, completed_by: fakeUserId,
      completed_at: new Date().toISOString(), is_pickup: true, task: theTask,
    }

    const scores = calculateBalanceScores([fakeProfile], [theTask], [completion])

    expect(scores).toHaveLength(1)
    expect(scores[0].pickup_score).toBe(3) // high effort = 3
    expect(scores[0].percentage).toBe(100)
  })

  it('expired invite is not returned when filtering by expiry date', async () => {
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Invite Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    householdIds.push(household!.id)

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { error: inviteError } = await testSupabase
      .from('invites')
      .insert({
        household_id: household!.id,
        token: `expired-token-${crypto.randomUUID()}`,
        created_by: null,
        expires_at: pastDate,
      })

    expect(inviteError).toBeNull()

    const { data: activeInvites, error: queryError } = await testSupabase
      .from('invites')
      .select()
      .eq('household_id', household!.id)
      .gt('expires_at', new Date().toISOString())

    expect(queryError).toBeNull()
    expect(activeInvites).toHaveLength(0)
  })
})
