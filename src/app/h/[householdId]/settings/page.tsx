import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DefaultTabForm } from './DefaultTabForm'
import { InviteSection } from './InviteSection'
import { HouseholdProfileForm } from './HouseholdProfileForm'
import type { HouseholdMember } from '@/lib/types'
import { coerceProfile } from '@/lib/types'

export default async function SettingsPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: member }, { data: household }, { data: members }] = await Promise.all([
    supabase
      .from('household_members')
      .select('default_tab')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('households')
      .select('profile')
      .eq('id', householdId)
      .single(),
    supabase
      .from('household_members')
      .select('user_id, default_tab, joined_at, profile:profiles!user_id(id, name, avatar_colour, created_at)')
      .eq('household_id', householdId),
  ])

  const profile = coerceProfile(household?.profile)
  const householdMembers = (members ?? []) as unknown as HouseholdMember[]

  return (
    <div className="space-y-6">
      <h2 className="font-semibold">Settings</h2>
      <DefaultTabForm
        householdId={householdId}
        currentDefault={member?.default_tab ?? 'balance'}
      />
      <HouseholdProfileForm
        householdId={householdId}
        initialProfile={profile}
        members={householdMembers}
      />
      <InviteSection householdId={householdId} />
    </div>
  )
}
