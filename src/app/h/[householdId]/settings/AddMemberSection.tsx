'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, Copy, Check } from 'lucide-react'

const PALETTE = ['#5E7FA6', '#8DAA94', '#E7B471', '#1F2D3D', '#F4C7B6', '#F2E8DC', '#DCE8E2']
const supabase = createClient()

interface Props {
  householdId: string
}

export function AddMemberSection({ householdId }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const colour = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    const { error: phErr } = await supabase.from('placeholder_members').insert({
      household_id: householdId,
      name: name.trim(),
      avatar_colour: colour,
    })

    if (phErr) {
      setError(phErr.message)
      setSaving(false)
      return
    }

    const res = await fetch(`/h/${householdId}/invite`, { method: 'POST' })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to generate invite link'); return }
    setInviteUrl(data.url)
  }

  async function copyToClipboard() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setName('')
    setInviteUrl(null)
    setCopied(false)
    setError(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Add a household member</h3>
        <p className="text-xs text-slate-400 mt-0.5">Creates a placeholder so you can assign tasks before they join</p>
      </div>

      {error && (
        <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {inviteUrl ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            <span className="font-medium">{name}</span> has been added. Share this link with them:
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 min-w-0">
              <Link2 size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 truncate">{inviteUrl}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
                copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Add another member
          </button>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Their name"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="shrink-0 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add & invite'}
          </button>
        </form>
      )}
    </div>
  )
}
