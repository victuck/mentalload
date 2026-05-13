'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DefaultTab } from '@/lib/types'

interface Props {
  householdId: string
  currentDefault: DefaultTab
}

const supabase = createClient()

export function DefaultTabForm({ householdId, currentDefault }: Props) {
  const [defaultTab, setDefaultTab] = useState<DefaultTab>(currentDefault)
  const [saved, setSaved] = useState(false)

  async function handleSave(tab: DefaultTab) {
    setDefaultTab(tab)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('household_members')
      .update({ default_tab: tab })
      .eq('household_id', householdId)
      .eq('user_id', user.id)
    if (!error) setSaved(true)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Default view</h3>
        <p className="text-xs text-slate-400 mt-0.5">Which tab opens first when you launch the app</p>
      </div>
      <div className="flex gap-3">
        {(['today', 'balance'] as DefaultTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleSave(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              defaultTab === tab
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab === 'today' ? 'Today' : 'Balance'}
          </button>
        ))}
      </div>
      {saved && <p className="text-xs text-emerald-600 font-medium">Saved ✓</p>}
    </div>
  )
}
