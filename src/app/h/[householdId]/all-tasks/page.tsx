import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AllTasksView } from './AllTasksView'
import type { Profile } from '@/lib/types'
import { coerceProfile } from '@/lib/types'

export default async function AllTasksPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: members }, { data: placeholders }, { data: tasks }, { data: household }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
      .eq('household_id', householdId),
    supabase
      .from('placeholder_members')
      .select('id, name, avatar_colour')
      .eq('household_id', householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .order('next_due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('households')
      .select('profile')
      .eq('id', householdId)
      .single(),
  ])

  const realProfiles = (members ?? []).map(m => m.profile as unknown as Profile)
  const placeholderProfiles = (placeholders ?? []).map(p => ({
    id: p.id, name: p.name, avatar_colour: p.avatar_colour, avatar_url: null, created_at: '',
  }) as Profile)
  const profiles = [...realProfiles, ...placeholderProfiles]
  const placeholderMemberIds = (placeholders ?? []).map(p => p.id)

  const householdProfile = coerceProfile(household?.profile)

  return (
    <AllTasksView
      householdId={householdId}
      currentUserId={user.id}
      members={profiles}
      placeholderMemberIds={placeholderMemberIds}
      tasks={tasks ?? []}
      householdProfile={householdProfile}
    />
  )
}
