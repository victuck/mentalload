'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HouseholdProfileFields } from '@/components/HouseholdProfileFields'
import { SuggestionsModal } from '@/components/SuggestionsModal'
import { getSuggestionsForProfile, profileDiff } from '@/lib/suggestions'
import type { HouseholdProfile, HouseholdMember, SuggestedTask } from '@/lib/types'

const supabase = createClient()

interface Props {
  householdId: string
  initialProfile: HouseholdProfile
  members: HouseholdMember[]
}

export function HouseholdProfileForm({ householdId, initialProfile, members }: Props) {
  const [profile, setProfile] = useState<HouseholdProfile>(initialProfile)
  const [savedProfile, setSavedProfile] = useState<HouseholdProfile>(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedTask[] | null>(null)

  const memberNames = Object.fromEntries(members.map(m => [m.user_id, m.profile.name]))
  const memberList = members.map(m => ({ user_id: m.user_id, name: m.profile.name }))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const { error: updateError } = await supabase
      .from('households')
      .update({ profile })
      .eq('id', householdId)

    if (updateError) { setError(updateError.message); setSaving(false); return }

    const additions = profileDiff(savedProfile, profile)
    setSavedProfile(profile)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title')
      .eq('household_id', householdId)
    const existingTitles = tasks?.map(t => t.title) ?? []
    const newSuggestions = getSuggestionsForProfile(additions, existingTitles, memberNames)

    setSaving(false)
    if (newSuggestions.length > 0) {
      setSuggestions(newSuggestions)
    } else {
      setSaved(true)
    }
  }

  if (suggestions) {
    return (
      <div className="border rounded p-4">
        <SuggestionsModal
          suggestions={suggestions}
          householdId={householdId}
          onDone={() => { setSuggestions(null); setSaved(true) }}
        />
      </div>
    )
  }

  return (
    <div className="border rounded p-4 space-y-4">
      <h3 className="font-semibold">Household profile</h3>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Saved.</p>}
      <HouseholdProfileFields
        profile={profile}
        members={memberList}
        onChange={p => { setProfile(p); setSaved(false) }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
