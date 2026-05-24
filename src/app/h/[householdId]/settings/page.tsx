import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DefaultTabForm } from './DefaultTabForm'
import { HouseholdNameForm } from './HouseholdNameForm'
import { ProfileForm } from './ProfileForm'
import { SignOutButton } from './SignOutButton'

export default async function SettingsPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: member }, { data: household }, { data: profile }] = await Promise.all([
    supabase
      .from('household_members')
      .select('default_tab')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('households')
      .select('name')
      .eq('id', householdId)
      .single(),
    supabase
      .from('profiles')
      .select('name, avatar_colour, avatar_url')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 text-lg">Settings</h2>
      <ProfileForm
        userId={user.id}
        initialName={profile?.name ?? ''}
        initialColour={profile?.avatar_colour ?? '#5E7FA6'}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
      <HouseholdNameForm
        householdId={householdId}
        initialName={household?.name ?? ''}
      />
      <DefaultTabForm
        householdId={householdId}
        currentDefault={member?.default_tab ?? 'balance'}
      />
      <div className="border-t border-slate-100 pt-4">
        <SignOutButton />
      </div>
    </div>
  )
}
