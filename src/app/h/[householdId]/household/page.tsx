import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HouseholdView } from './HouseholdView'
import type { HouseholdMember } from '@/lib/types'
import { coerceProfile } from '@/lib/types'

export default async function HouseholdPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: household }, { data: members }, { data: placeholders }, { data: tasks }] = await Promise.all([
    supabase.from('households').select('profile').eq('id', householdId).single(),
    supabase
      .from('household_members')
      .select('user_id, default_tab, joined_at, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('placeholder_members')
      .select('id, name')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId),
  ])

  const profile = coerceProfile(household?.profile)
  const householdMembers = (members ?? []) as unknown as HouseholdMember[]
  const placeholderList = (placeholders ?? []) as { id: string; name: string }[]

  return (
    <HouseholdView
      householdId={householdId}
      currentUserId={user.id}
      members={householdMembers}
      placeholders={placeholderList}
      profile={profile}
      tasks={tasks ?? []}
    />
  )
}
