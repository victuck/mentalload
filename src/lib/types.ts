export type Frequency = 'one-off' | 'daily' | 'weekly' | 'monthly' | 'custom'
export type Effort = 'low' | 'medium' | 'high'
export type Category = 'chores' | 'planning' | 'errands' | 'admin' | 'other'
export type DefaultTab = 'today' | 'balance'

export interface Profile {
  id: string
  name: string
  avatar_colour: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  default_tab: DefaultTab
  joined_at: string
  profile: Profile
}

export interface Task {
  id: string
  household_id: string
  title: string
  owner_id: string | null
  category: Category
  frequency: Frequency
  custom_frequency_label: string | null
  custom_frequency_weight: number | null
  next_due_date: string | null
  effort: Effort
  is_invisible_work: boolean
  created_by: string | null
  created_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  completed_by: string
  completed_at: string
  is_pickup: boolean
  task?: Task
}

export interface Invite {
  id: string
  household_id: string
  token: string
  created_by: string
  expires_at: string
  created_at: string
}

export interface BalanceScore {
  member_id: string
  owned_score: number
  pickup_score: number
  total_score: number
  percentage: number
}
