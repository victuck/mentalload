import { describe, it, expect } from 'vitest'
import {
  getFrequencyWeight,
  calculateOwnedScore,
  calculatePickupScore,
  calculateBalanceScores,
  getNextDueDate,
} from './balance'
import type { Task, TaskCompletion, Profile } from './types'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  household_id: 'h1',
  title: 'Test task',
  owner_id: 'u1',
  category: 'chores',
  frequency: 'weekly',
  custom_frequency_label: null,
  custom_frequency_weight: null,
  next_due_date: null,
  effort: 'medium',
  is_invisible_work: false,
  snooze_count: 0,
  placeholder_owner_id: null,
  notes: null,
  created_by: 'u1',
  created_at: new Date().toISOString(),
  is_shared: false,
  current_turn_user_id: null,
  ...overrides,
})

const makeCompletion = (overrides: Partial<TaskCompletion> = {}): TaskCompletion => ({
  id: 'c1',
  task_id: '1',
  completed_by: 'u2',
  completed_at: new Date().toISOString(),
  is_pickup: true,
  task: makeTask(),
  ...overrides,
})

const makeProfile = (id: string): Profile => ({
  id,
  name: `User ${id}`,
  avatar_colour: '#6366f1',
  created_at: new Date().toISOString(),
})

describe('getFrequencyWeight', () => {
  it('returns 7 for daily', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'daily' }))).toBe(7)
  })
  it('returns 4 for weekly', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'weekly' }))).toBe(4)
  })
  it('returns 2 for monthly', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'monthly' }))).toBe(2)
  })
  it('returns 1 for one-off', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'one-off' }))).toBe(1)
  })
  it('returns custom_frequency_weight for custom', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'custom', custom_frequency_weight: 5 }))).toBe(5)
  })
  it('falls back to 1 if custom weight is null', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'custom', custom_frequency_weight: null }))).toBe(1)
  })
})

describe('calculateOwnedScore', () => {
  it('returns 0 for empty list', () => {
    expect(calculateOwnedScore([])).toBe(0)
  })
  it('multiplies frequency weight by effort weight', () => {
    // weekly(4) × medium(2) = 8
    expect(calculateOwnedScore([makeTask({ frequency: 'weekly', effort: 'medium' })])).toBe(8)
  })
  it('sums across multiple tasks', () => {
    // daily(7)×low(1)=7 + monthly(2)×high(3)=6 → 13
    expect(calculateOwnedScore([
      makeTask({ frequency: 'daily', effort: 'low' }),
      makeTask({ frequency: 'monthly', effort: 'high' }),
    ])).toBe(13)
  })
})

describe('calculatePickupScore', () => {
  it('returns 0 for empty list', () => {
    expect(calculatePickupScore([])).toBe(0)
  })
  it('ignores non-pickup completions', () => {
    expect(calculatePickupScore([
      makeCompletion({ is_pickup: false, task: makeTask({ effort: 'high' }) }),
    ])).toBe(0)
  })
  it('sums effort weights for pickups', () => {
    // low(1) + high(3) = 4
    expect(calculatePickupScore([
      makeCompletion({ is_pickup: true, task: makeTask({ effort: 'low' }) }),
      makeCompletion({ is_pickup: true, task: makeTask({ effort: 'high' }) }),
    ])).toBe(4)
  })
})

describe('calculateBalanceScores', () => {
  it('returns 0% for all members when no tasks', () => {
    const scores = calculateBalanceScores([makeProfile('u1'), makeProfile('u2')], [], [])
    expect(scores.every(s => s.percentage === 0)).toBe(true)
  })
  it('assigns 100% to sole task owner', () => {
    const scores = calculateBalanceScores(
      [makeProfile('u1'), makeProfile('u2')],
      [makeTask({ owner_id: 'u1' })],
      []
    )
    expect(scores.find(s => s.member_id === 'u1')!.percentage).toBe(100)
    expect(scores.find(s => s.member_id === 'u2')!.percentage).toBe(0)
  })
  it('includes pickup completions in score', () => {
    // u1 owns weekly(4)×low(1)=4; u2 picks up high(3) task → total 7
    const scores = calculateBalanceScores(
      [makeProfile('u1'), makeProfile('u2')],
      [makeTask({ owner_id: 'u1', frequency: 'weekly', effort: 'low' })],
      [makeCompletion({ completed_by: 'u2', is_pickup: true, task: makeTask({ effort: 'high' }) })]
    )
    expect(scores.find(s => s.member_id === 'u1')!.percentage).toBe(57)
    expect(scores.find(s => s.member_id === 'u2')!.percentage).toBe(43)
  })
})

describe('getNextDueDate', () => {
  it('returns null for one-off', () => {
    expect(getNextDueDate('one-off', new Date())).toBeNull()
  })
  it('returns null for custom', () => {
    expect(getNextDueDate('custom', new Date())).toBeNull()
  })
  it('advances 1 day for daily', () => {
    const next = getNextDueDate('daily', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-12')
  })
  it('advances 7 days for weekly', () => {
    const next = getNextDueDate('weekly', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-18')
  })
  it('advances 1 month for monthly', () => {
    const next = getNextDueDate('monthly', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-11')
  })
})
