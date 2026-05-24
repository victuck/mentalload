'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
import { ProfileStep } from './ProfileStep'
import { InviteStep } from './InviteStep'
import { SeedTasks } from './SeedTasks'
import { WelcomeModal, WELCOME_STORAGE_KEY } from '@/components/WelcomeModal'
import { Scale } from 'lucide-react'
import type { HouseholdProfile } from '@/lib/types'
import { EMPTY_PROFILE } from '@/lib/types'

const AVATAR_COLOURS = ['#5E7FA6', '#8DAA94', '#E7B471', '#1F2D3D', '#F4C7B6', '#F2E8DC', '#DCE8E2']

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-colors ${
            i + 1 <= current ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function SignOutLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
    >
      Sign out
    </button>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_PROFILE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [placeholderId, setPlaceholderId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_STORAGE_KEY)) setShowWelcome(true)
  }, [])

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
    if (partnerName.trim()) {
      const colour = AVATAR_COLOURS[Math.floor(Math.random() * AVATAR_COLOURS.length)]
      const { data: ph } = await supabase
        .from('placeholder_members')
        .insert({ household_id: id, name: partnerName.trim(), avatar_colour: colour })
        .select('id')
        .single()
      if (ph) setPlaceholderId(ph.id)
    }
    setLoading(false)
    setStep(2)
  }

  function handleProfileNext(p: HouseholdProfile) {
    setProfile(p)
    setStep(3)
  }

  function handleInviteNext() {
    setStep(4)
  }

  function handleDone() {
    router.push(`/h/${householdId}/balance`)
  }

  if (step === 2 && householdId && userId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-lg">
          <StepIndicator current={2} total={4} />
          <ProfileStep
            householdId={householdId}
            userId={userId}
            userName={name}
            placeholderId={placeholderId}
            placeholderName={partnerName.trim() || undefined}
            onNext={handleProfileNext}
            onSkip={() => setStep(3)}
          />
          <div className="mt-4 text-center"><SignOutLink /></div>
        </div>
      </main>
    )
  }

  if (step === 3 && householdId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
          <StepIndicator current={3} total={4} />
          <InviteStep householdId={householdId} onNext={handleInviteNext} />
          <div className="mt-4 text-center"><SignOutLink /></div>
        </div>
      </main>
    )
  }

  if (step === 4 && householdId && userId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
          <StepIndicator current={4} total={4} />
          <SeedTasks
            profile={profile}
            householdId={householdId}
            memberNames={{
              [userId]: name,
              ...(placeholderId && partnerName.trim() ? { [placeholderId]: partnerName.trim() } : {}),
            }}
            placeholderMemberIds={placeholderId ? [placeholderId] : []}
            onDone={handleDone}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-4">
            <Scale size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
          <p className="text-slate-500 text-sm mt-1">Let's set up your household</p>
        </div>

        <StepIndicator current={1} total={4} />

        <form onSubmit={handleStep1} className="space-y-4">
          {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">Your name</label>
            <input
              id="name"
              required
              autoComplete="off"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="householdName" className="text-sm font-medium text-slate-700">Household name</label>
            <input
              id="householdName"
              required
              autoComplete="off"
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              placeholder="The Smiths"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="partnerName" className="text-sm font-medium text-slate-700">
              Partner's name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="partnerName"
              autoComplete="off"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder="Jamie"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create household →'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <SignOutLink />
        </div>
      </div>
    </main>
  )
}
