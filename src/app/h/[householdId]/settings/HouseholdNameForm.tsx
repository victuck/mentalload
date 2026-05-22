'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface Props {
  householdId: string
  initialName: string
}

export function HouseholdNameForm({ householdId, initialName }: Props) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error: updateError } = await supabase
      .from('households')
      .update({ name: name.trim() })
      .eq('id', householdId)
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setSaved(true)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Household name</h3>
        <p className="text-xs text-slate-400 mt-0.5">Shown in the header on every screen</p>
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <form onSubmit={handleSave} className="flex gap-2">
        <input
          type="text"
          required
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {saved && <p className="text-xs text-emerald-600 font-medium">Saved ✓</p>}
    </div>
  )
}
