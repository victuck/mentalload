'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UnassignedReview } from './UnassignedReview'
import { ClaimPlaceholder } from './ClaimPlaceholder'
import type { Task, Profile } from '@/lib/types'

const supabase = createClient()

interface Props {
  tasks: Task[]
  householdId: string
  userId: string
  members: Profile[]
  initialName: string
  placeholder?: { id: string; name: string } | null
}

export function JoinClient({ tasks, householdId, userId, members, initialName, placeholder }: Props) {
  const router = useRouter()
  const [named, setNamed] = useState(false)
  const [claimDone, setClaimDone] = useState(!placeholder)
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMembers, setCurrentMembers] = useState(members)

  async function handleSetName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', userId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setCurrentMembers(prev => prev.map(m => m.id === userId ? { ...m, name: name.trim() } : m))
    setNamed(true)
  }

  if (!named) {
    return (
      <div className="w-full space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome!</h1>
          <p className="text-sm text-slate-500 mt-1">What should your household call you?</p>
        </div>
        {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSetName} className="space-y-4">
          <input
            autoFocus
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    )
  }

  if (!claimDone && placeholder) {
    return (
      <ClaimPlaceholder
        placeholder={placeholder}
        householdId={householdId}
        onDone={() => setClaimDone(true)}
      />
    )
  }

  if (tasks.length === 0) {
    router.push(`/h/${householdId}/balance`)
    return null
  }

  return (
    <UnassignedReview
      tasks={tasks}
      householdId={householdId}
      userId={userId}
      members={currentMembers}
    />
  )
}
