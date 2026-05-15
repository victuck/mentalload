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
  const memberList = members.map(m => ({ id: m.user_id, name: m.profile.name }))

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

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('title')
      .eq('household_id', householdId)
    if (tasksError) { setError(tasksError.message); setSaving(false); return }
    setSavedProfile(profile)
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <SuggestionsModal
          suggestions={suggestions}
          householdId={householdId}
          members={memberList}
          onDone={() => { setSuggestions(null); setSaved(true) }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Household profile</h3>
        <p className="text-xs text-slate-400 mt-0.5">Used to suggest relevant tasks for your household</p>
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-xs text-emerald-600 font-medium">Saved ✓</p>}
      <HouseholdProfileFields
        profile={profile}
        members={memberList}
        onChange={p => { setProfile(p); setSaved(false) }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  )
}
