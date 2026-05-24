import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinClient } from './JoinClient'
import type { Profile } from '@/lib/types'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/join/${token}`)
  }

  // Ensure a profile row exists — handle_new_user trigger may not have run
  // for users who signed up before the trigger was in place.
  await supabase.from('profiles').upsert(
    { id: user.id, name: user.email?.split('@')[0] ?? 'User', avatar_colour: '#5E7FA6' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-2">Link expired</h1>
          <p className="text-slate-600">Ask a household member to send you a new invite link.</p>
        </div>
      </main>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('household_id', invite.household_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect(`/h/${invite.household_id}/today`)
  }

  // Join the household
  const { error: joinError } = await supabase.from('household_members').insert({
    household_id: invite.household_id,
    user_id: user.id,
    default_tab: 'balance',
  })

  if (joinError) {
    // Unique constraint: they already joined (e.g. retry after a network hiccup) — just continue
    if (joinError.code === '23505') {
      redirect(`/h/${invite.household_id}/today`)
    }
    console.error('join household_members insert failed', joinError)
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-slate-600">Could not join the household. Please try the link again.</p>
          <p className="text-slate-400 text-xs mt-3">{joinError.code}: {joinError.message}</p>
        </div>
      </main>
    )
  }

  const [{ data: unassigned }, { data: memberRows }, { data: placeholder }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', invite.household_id)
      .is('owner_id', null)
      .is('placeholder_owner_id', null),
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour, avatar_url, created_at)')
      .eq('household_id', invite.household_id),
    supabase
      .from('placeholder_members')
      .select('id, name')
      .eq('household_id', invite.household_id)
      .maybeSingle(),
  ])

  const members = (memberRows ?? []).map(m => m.profile as unknown as Profile)
  const myProfile = members.find(m => m.id === user.id)
  const initialName = myProfile?.name ?? ''

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <JoinClient
          tasks={unassigned ?? []}
          householdId={invite.household_id}
          userId={user.id}
          members={members}
          initialName={initialName}
          placeholder={placeholder ?? null}
        />
      </div>
    </main>
  )
}
