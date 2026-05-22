import type { Task, TaskCompletion, Profile, BalanceScore, Effort, Frequency } from './types'

const EFFORT_WEIGHTS: Record<Effort, number> = { low: 1, medium: 2, high: 3 }

const FREQUENCY_WEIGHTS: Record<Exclude<Frequency, 'custom'>, number> = {
  'one-off': 1,
  daily: 7,
  weekly: 4,
  fortnightly: 2,
  monthly: 2,
  quarterly: 1,
  annual: 1,
}

export function getFrequencyWeight(task: Task): number {
  if (task.frequency === 'custom') return task.custom_frequency_weight ?? 1
  return FREQUENCY_WEIGHTS[task.frequency]
}

export function calculateOwnedScore(tasks: Task[]): number {
  return tasks.reduce(
    (sum, task) => sum + getFrequencyWeight(task) * EFFORT_WEIGHTS[task.effort],
    0
  )
}

export function calculatePickupScore(completions: TaskCompletion[]): number {
  return completions
    .filter(c => c.is_pickup && c.task)
    .reduce((sum, c) => sum + EFFORT_WEIGHTS[c.task!.effort], 0)
}

export function calculateBalanceScores(
  members: Profile[],
  tasks: Task[],
  completions: TaskCompletion[]
): BalanceScore[] {
  const raw = members.map(member => {
    const ownedScore = calculateOwnedScore(tasks.filter(t => t.owner_id === member.id))
    const pickupScore = calculatePickupScore(completions.filter(c => c.completed_by === member.id && c.is_pickup))
    return {
      member_id: member.id,
      owned_score: ownedScore,
      pickup_score: pickupScore,
      total_score: ownedScore + pickupScore,
      percentage: 0,
    }
  })

  const total = raw.reduce((sum, s) => sum + s.total_score, 0)
  return raw.map(s => ({
    ...s,
    percentage: total === 0 ? 0 : Math.round((s.total_score / total) * 100),
  }))
}

export function getNextDueDate(frequency: Frequency, currentDueDate: Date): Date | null {
  if (frequency === 'one-off' || frequency === 'custom') return null
  const next = new Date(currentDueDate)
  if (frequency === 'daily') next.setDate(next.getDate() + 1)
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'fortnightly') next.setDate(next.getDate() + 14)
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
  else if (frequency === 'annual') next.setFullYear(next.getFullYear() + 1)
  return next
}
