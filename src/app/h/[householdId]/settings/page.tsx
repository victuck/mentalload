import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DefaultTabForm } from './DefaultTabForm'
import { InviteSection } from './InviteSection'

export default async function SettingsPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('household_members')
    .select('default_tab')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <h2 className="font-semibold">Settings</h2>
      <DefaultTabForm
        householdId={householdId}
        currentDefault={member?.default_tab ?? 'balance'}
      />
      <InviteSection householdId={householdId} />
    </div>
  )
}
