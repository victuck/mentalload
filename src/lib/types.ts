export type Frequency = 'one-off' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'
export type Effort = 'low' | 'medium' | 'high'
export type Category = 'chores' | 'planning' | 'errands' | 'admin' | 'garden' | 'other'
export type DefaultTab = 'today' | 'balance'

export interface Profile {
  id: string
  name: string
  avatar_colour: string
  avatar_url?: string | null
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
  snooze_count: number
  placeholder_owner_id: string | null
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

export interface PlaceholderMember {
  id: string
  household_id: string
  name: string
  avatar_colour: string
  created_at: string
}

export interface BalanceScore {
  member_id: string
  owned_score: number
  pickup_score: number
  total_score: number
  percentage: number
}

export interface HouseholdProfile {
  home: {
    owned: boolean
    has_garden: boolean
  }
  vehicles: Array<{ type: 'car' | 'motorbike' | 'van' | 'other'; name?: string }>
  member_health_needs: string[]
  kids: Array<{
    name?: string
    birthday: string
    has_health_needs?: boolean
  }>
  pets: Array<{
    type: 'dog' | 'cat' | 'other'
    name?: string
  }>
  family: Array<{
    role: 'parent' | 'sibling' | 'nibling' | 'aunt' | 'uncle' | 'grandparent' | 'other'
    name?: string
    birthday?: string
    notes?: string
    has_health_needs?: boolean
  }>
}

export const EMPTY_PROFILE: HouseholdProfile = {
  home: { owned: false, has_garden: false },
  vehicles: [],
  member_health_needs: [],
  kids: [],
  pets: [],
  family: [],
}

export interface SuggestedTask {
  title: string
  category: Category
  effort: Effort
  frequency: Frequency
  personLabel?: string
}

export function coerceProfile(raw: unknown): HouseholdProfile {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PROFILE, home: { ...EMPTY_PROFILE.home }, vehicles: [], member_health_needs: [], kids: [], pets: [], family: [] }
  const p = raw as Partial<HouseholdProfile>
  return {
    home: { owned: false, has_garden: false, ...p.home },
    vehicles: p.vehicles ?? [],
    member_health_needs: p.member_health_needs ?? [],
    kids: p.kids ?? [],
    pets: p.pets ?? [],
    family: p.family ?? [],
  }
}
