'use client'

import { useState } from 'react'
import { Link2, Copy, Check } from 'lucide-react'

interface Props {
  householdId: string
}

export function InviteSection({ householdId }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setLoading(true)
    try {
      const res = await fetch(`/h/${householdId}/invite`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setUrl(data.url)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Invite a member</h3>
        <p className="text-xs text-slate-400 mt-0.5">Links expire after 24 hours</p>
      </div>
      {url ? (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
            <Link2 size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 truncate">{url}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
      ) : (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating…' : 'Generate invite link'}
        </button>
      )}
    </div>
  )
}
