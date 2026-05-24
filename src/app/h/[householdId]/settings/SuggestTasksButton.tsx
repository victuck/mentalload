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

interface ModalMembers { id: string; name: string }

export function SuggestTasksButton({ householdId, members }: Props) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [modalMembers, setModalMembers] = useState<ModalMembers[]>([])
  const [placeholderIds, setPlaceholderIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const memberNames = Object.fromEntries(members.map(m => [m.profile.id, m.profile.name]))

  async function handleOpen() {
    setLoading(true)
    const [{ data: householdData }, { data: tasks }, { data: placeholders }] = await Promise.all([
      supabase.from('households').select('profile').eq('id', householdId).single(),
      supabase.from('tasks').select('title').eq('household_id', householdId),
      supabase.from('placeholder_members').select('id, name').eq('household_id', householdId),
    ])
    const profile = coerceProfile(householdData?.profile)
    const existingTitles = (tasks ?? []).map((t: { title: string }) => t.title)
    const phMembers = (placeholders ?? []) as { id: string; name: string }[]
    setModalMembers([
      ...members.map(m => ({ id: m.profile.id, name: m.profile.name })),
      ...phMembers,
    ])
    setPlaceholderIds(phMembers.map(p => p.id))
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
          members={modalMembers}
          placeholderMemberIds={placeholderIds}
          onDone={() => setOpen(false)}
        />
      )}

      {open && suggestions.length === 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 w-full max-w-sm text-center space-y-4">
            <p className="text-lg font-semibold text-slate-900">You're all set</p>
            <p className="text-sm text-slate-500">All the tasks we'd suggest for your household profile are already added.</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
