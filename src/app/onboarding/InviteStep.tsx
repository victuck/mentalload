'use client'
import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  householdId: string
  onNext: () => void
}

export function InviteStep({ householdId, onNext }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/h/${householdId}/invite`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { setUrl(d.url); setLoading(false) })
  }, [householdId])

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Invite your household</h2>
        <p className="text-sm text-slate-500 mt-1">Share this link with anyone who lives with you. Once they join you can assign tasks to them.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
        <span className="text-sm text-slate-500 flex-1 truncate font-mono text-xs">
          {loading ? 'Generating link…' : url}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          {copied
            ? <><Check size={13} className="text-emerald-600" /> Copied</>
            : <><Copy size={13} /> Copy link</>
          }
        </button>
      </div>

      <p className="text-xs text-slate-400">Link expires in 7 days. You can generate a new one from Settings.</p>

      <button
        type="button"
        onClick={onNext}
        className="w-full bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Continue to tasks →
      </button>

      <button
        type="button"
        onClick={onNext}
        className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
