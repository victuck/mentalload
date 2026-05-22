'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SuggestionsModal } from '@/components/SuggestionsModal'
import { getSuggestionsForProfile } from '@/lib/suggestions'
import { coerceProfile } from '@/lib/types'
import type { HouseholdMember, SuggestedTask } from '@/lib/types'

const supabase = createClient()

interface Props {
  householdId: string
  members: HouseholdMember[]
}

export function SuggestTasksButton({ householdId, members }: Props) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [loading, setLoading] = useState(false)

  const memberNames = Object.fromEntries(members.map(m => [m.profile.id, m.profile.name]))

  async function handleOpen() {
    setLoading(true)
    const [{ data: householdData }, { data: tasks }] = await Promise.all([
      supabase.from('households').select('profile').eq('id', householdId).single(),
      supabase.from('tasks').select('title').eq('household_id', householdId),
    ])
    const profile = coerceProfile(householdData?.profile)
    const existingTitles = (tasks ?? []).map(t => t.title)
    setSuggestions(getSuggestionsForProfile(profile, existingTitles, memberNames))
    setLoading(false)
    setOpen(true)
  }

  return (
    <>
      <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Suggested tasks</p>
          <p className="text-xs text-slate-500 mt-0.5">Add tasks based on your household profile</p>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          disabled={loading}
          className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : 'Review →'}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <SuggestionsModal
          suggestions={suggestions}
          householdId={householdId}
          members={members.map(m => ({ id: m.profile.id, name: m.profile.name }))}
          onDone={() => setOpen(false)}
        />
      )}
    </>
  )
}
