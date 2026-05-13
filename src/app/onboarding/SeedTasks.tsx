'use client'
import { SuggestionsModal } from '@/components/SuggestionsModal'
import { getSuggestionsForProfile } from '@/lib/suggestions'
import type { HouseholdProfile } from '@/lib/types'

interface Props {
  profile: HouseholdProfile
  householdId: string
  memberNames: Record<string, string>
  onDone: () => void
}

export function SeedTasks({ profile, householdId, memberNames, onDone }: Props) {
  const suggestions = getSuggestionsForProfile(profile, [], memberNames)

  if (suggestions.length === 0) {
    return (
      <div className="max-w-sm w-full space-y-4">
        <h2 className="text-xl font-semibold">You're all set</h2>
        <p className="text-sm text-gray-600">No suggestions for your profile. You can add tasks manually.</p>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Done, see my balance
        </button>
      </div>
    )
  }

  return <SuggestionsModal suggestions={suggestions} householdId={householdId} onDone={onDone} />
}
