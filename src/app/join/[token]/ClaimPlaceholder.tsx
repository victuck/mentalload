'use client'

import { useState } from 'react'

interface Props {
  placeholder: { id: string; name: string }
  householdId: string
  onDone: () => void
}

export function ClaimPlaceholder({ placeholder, householdId, onDone }: Props) {
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClaim() {
    setClaiming(true)
    setError(null)
    const res = await fetch(`/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim_placeholder', placeholder_id: placeholder.id }),
    })
    setClaiming(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return
    }
    onDone()
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">One more thing</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your household has a slot set up for <strong>{placeholder.name}</strong> — is that you?
        </p>
      </div>

      {error && (
        <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="button"
        onClick={handleClaim}
        disabled={claiming}
        className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {claiming ? 'Claiming…' : `Yes, I'm ${placeholder.name}`}
      </button>

      <button
        type="button"
        onClick={onDone}
        disabled={claiming}
        className="w-full border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        No, I'm someone else
      </button>
    </div>
  )
}
