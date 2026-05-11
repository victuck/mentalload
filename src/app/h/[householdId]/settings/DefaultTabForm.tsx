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
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-medium">Default tab when opening the app</h3>
      <div className="flex gap-3">
        {(['today', 'balance'] as DefaultTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleSave(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              defaultTab === tab
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab === 'today' ? 'Today' : 'Balance'}
          </button>
        ))}
      </div>
      {saved && <p className="text-xs text-green-600">Saved.</p>}
    </div>
  )
}
