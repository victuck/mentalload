'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HouseholdProfileFields } from '@/components/HouseholdProfileFields'
import type { HouseholdProfile } from '@/lib/types'
import { EMPTY_PROFILE } from '@/lib/types'

const supabase = createClient()

interface Props {
  householdId: string
  userId: string
  userName: string
  onNext: (profile: HouseholdProfile) => void
  onSkip: () => void
}

export function ProfileStep({ householdId, userId, userName, onNext, onSkip }: Props) {
  const [profile, setProfile] = useState<HouseholdProfile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('households').update({ profile }).eq('id', householdId)
    setSaving(false)
    if (error) { setError(error.message); return }
    onNext(profile)
  }

  return (
    <div className="max-w-sm w-full space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tell us about your household</h1>
        <p className="text-sm text-gray-600 mt-1">We use this to suggest relevant tasks. You can update it any time in settings.</p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <HouseholdProfileFields
        profile={profile}
        members={[{ user_id: userId, name: userName }]}
        onChange={setProfile}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Next'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
