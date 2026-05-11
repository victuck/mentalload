'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    // Update profile name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id)

    if (profileError) { setError(profileError.message); setLoading(false); return }

    // Create household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: householdName })
      .select()
      .single()

    if (householdError || !household) { setError(householdError?.message ?? 'Failed to create household'); setLoading(false); return }

    // Join as member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id, default_tab: 'balance' })

    if (memberError) { setError(memberError.message); setLoading(false); return }

    router.push(`/h/${household.id}/balance`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Set up your household</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm font-medium">Your name</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Household name</label>
          <input
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
