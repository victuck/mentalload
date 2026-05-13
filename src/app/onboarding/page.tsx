'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProfileStep } from './ProfileStep'
import { SeedTasks } from './SeedTasks'
import type { HouseholdProfile } from '@/lib/types'
import { EMPTY_PROFILE } from '@/lib/types'

const supabase = createClient()

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_PROFILE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id)
    if (profileError) { setError(profileError.message); setLoading(false); return }

    const { data: id, error: householdError } = await supabase
      .rpc('create_household', { household_name: householdName, member_default_tab: 'balance' })
    if (householdError || !id) { setError(householdError?.message ?? 'Failed to create household'); setLoading(false); return }

    setHouseholdId(id)
    setUserId(user.id)
    setLoading(false)
    setStep(2)
  }

  function handleProfileNext(p: HouseholdProfile) {
    setProfile(p)
    setStep(3)
  }

  function handleDone() {
    router.push(`/h/${householdId}/balance`)
  }

  if (step === 2 && householdId && userId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <ProfileStep
          householdId={householdId}
          userId={userId}
          userName={name}
          onNext={handleProfileNext}
          onSkip={() => setStep(3)}
        />
      </main>
    )
  }

  if (step === 3 && householdId && userId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <SeedTasks
          profile={profile}
          householdId={householdId}
          memberNames={{ [userId]: name }}
          onDone={handleDone}
        />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleStep1} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Set up your household</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">Your name</label>
          <input
            id="name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="householdName" className="text-sm font-medium">Household name</label>
          <input
            id="householdName"
            required
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            placeholder="The Smiths"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create household'}
        </button>
      </form>
    </main>
  )
}
