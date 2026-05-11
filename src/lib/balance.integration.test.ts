import { describe, it, expect, afterEach } from 'vitest'
import { testSupabase, cleanupTestHousehold } from '../test-utils/supabase'
import { calculateBalanceScores } from './balance'
import type { Task, TaskCompletion, Profile } from './types'

// Track households to clean up after each test
let currentHouseholdId: string | null = null

afterEach(async () => {
  if (currentHouseholdId) {
    await cleanupTestHousehold(currentHouseholdId)
    currentHouseholdId = null
  }
})

describe('balance integration tests', () => {
  it('Test 1: creates a household and tasks, returns empty scores with no members', async () => {
    // Create a household
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Integration Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    expect(household).not.toBeNull()

    currentHouseholdId = household!.id
    const today = new Date().toISOString().slice(0, 10)

    // Insert 2 tasks with owner_id: null
    const { data: tasks, error: tasksError } = await testSupabase
      .from('tasks')
      .insert([
        {
          household_id: household!.id,
          title: 'Daily chore',
          owner_id: null,
          category: 'chores',
          frequency: 'daily',
          effort: 'medium',
          is_invisible_work: false,
          next_due_date: today,
        },
        {
          household_id: household!.id,
          title: 'Weekly errand',
          owner_id: null,
          category: 'errands',
          frequency: 'weekly',
          effort: 'low',
          is_invisible_work: false,
          next_due_date: today,
        },
      ])
      .select()

    expect(tasksError).toBeNull()
    expect(tasks).toHaveLength(2)

    // No members → empty scores
    const scores = calculateBalanceScores([], tasks as Task[], [])
    expect(scores).toEqual([])
  })

  it('Test 2: pickup completions affect balance scores', async () => {
    // Create a household
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Pickup Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    currentHouseholdId = household!.id

    // Insert one task (weekly, high effort)
    const { data: tasks, error: tasksError } = await testSupabase
      .from('tasks')
      .insert([
        {
          household_id: household!.id,
          title: 'Weekly high effort task',
          owner_id: null,
          category: 'planning',
          frequency: 'weekly',
          effort: 'high',
          is_invisible_work: false,
          next_due_date: new Date().toISOString().slice(0, 10),
        },
      ])
      .select()

    expect(tasksError).toBeNull()
    expect(tasks).toHaveLength(1)

    const theTask = tasks![0] as Task

    // Fake profile (not in DB — calculateBalanceScores only needs in-memory Profile objects)
    const fakeUserId = 'aaaaaaaa-0000-0000-0000-000000000001'
    const fakeProfile: Profile = {
      id: fakeUserId,
      name: 'Test User',
      avatar_colour: '#6366f1',
      created_at: new Date().toISOString(),
    }

    // TaskCompletion with is_pickup: true and task populated
    const completion: TaskCompletion = {
      id: 'bbbbbbbb-0000-0000-0000-000000000001',
      task_id: theTask.id,
      completed_by: fakeUserId,
      completed_at: new Date().toISOString(),
      is_pickup: true,
      task: theTask,
    }

    const scores = calculateBalanceScores([fakeProfile], [theTask], [completion])

    expect(scores).toHaveLength(1)
    // high effort = 3 points pickup score
    expect(scores[0].pickup_score).toBe(3)
    // sole member → 100%
    expect(scores[0].percentage).toBe(100)
  })

  it('Test 3: expired invite is not returned by expiry filter', async () => {
    // Create a household
    const { data: household, error: householdError } = await testSupabase
      .from('households')
      .insert({ name: 'Invite Test Household' })
      .select()
      .single()

    expect(householdError).toBeNull()
    currentHouseholdId = household!.id

    // Insert an invite with expires_at in the past.
    // created_by is nullable (IS NULL allowed in the DB schema), so we omit it.
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { error: inviteError } = await testSupabase
      .from('invites')
      .insert({
        household_id: household!.id,
        token: `expired-token-${Date.now()}`,
        created_by: null,
        expires_at: pastDate,
      })

    expect(inviteError).toBeNull()

    // Query invites that haven't expired yet
    const { data: activeInvites, error: queryError } = await testSupabase
      .from('invites')
      .select()
      .eq('household_id', household!.id)
      .gt('expires_at', new Date().toISOString())

    expect(queryError).toBeNull()
    // The expired invite should not appear
    expect(activeInvites).toHaveLength(0)
  })
})
