import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HouseholdProfileForm } from '../settings/HouseholdProfileForm'
import { SuggestTasksButton } from '../settings/SuggestTasksButton'
import { InviteSection } from '../settings/InviteSection'
import type { HouseholdMember } from '@/lib/types'
import { coerceProfile } from '@/lib/types'

export default async function HouseholdPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from('households').select('profile').eq('id', householdId).single(),
    supabase
      .from('household_members')
      .select('user_id, default_tab, joined_at, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
      .eq('household_id', householdId),
  ])

  const profile = coerceProfile(household?.profile)
  const householdMembers = (members ?? []) as unknown as HouseholdMember[]

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 text-lg">Household</h2>
      <HouseholdProfileForm
        householdId={householdId}
        initialProfile={profile}
        members={householdMembers}
      />
      <SuggestTasksButton
        householdId={householdId}
        members={householdMembers}
      />
      <InviteSection householdId={householdId} />
    </div>
  )
}
