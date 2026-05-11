import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/join/${token}`)
  }

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
          <p className="text-gray-600">Ask a household member to send you a new invite link.</p>
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
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-gray-600">Could not join the household. Please try the link again.</p>
        </div>
      </main>
    )
  }

  redirect(`/h/${invite.household_id}/balance`)
}
