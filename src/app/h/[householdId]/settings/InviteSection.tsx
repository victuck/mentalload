'use client'

import { useState } from 'react'

interface Props {
  householdId: string
}

export function InviteSection({ householdId }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setLoading(true)
    const res = await fetch(`/h/${householdId}/invite`, { method: 'POST' })
    const data = await res.json()
    setUrl(data.url)
    setLoading(false)
  }

  async function copyToClipboard() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-medium">Invite someone to this household</h3>
      <p className="text-xs text-gray-500">Links expire after 24 hours.</p>
      {url ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 border rounded px-3 py-2 text-xs bg-gray-50 text-gray-700"
          />
          <button
            onClick={copyToClipboard}
            className="shrink-0 bg-indigo-600 text-white text-xs px-3 py-2 rounded hover:bg-indigo-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate invite link'}
        </button>
      )}
    </div>
  )
}
