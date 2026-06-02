'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { WELCOME_STORAGE_KEY } from '@/components/WelcomeModal'
import { createClient } from '@/lib/supabase/client'

export function DeleteHouseholdButton({ householdId }: { householdId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/h/${householdId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? `Error ${res.status}. Please try again.`)
      setDeleting(false)
      return
    }
    localStorage.removeItem(WELCOME_STORAGE_KEY)
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  const confirmed = confirmText.trim().toUpperCase() === 'DELETE'

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 font-medium transition-colors whitespace-nowrap"
      >
        <Trash2 size={15} />
        Delete household
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="font-semibold text-slate-900 text-base">Delete household?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  This permanently deletes <strong>all tasks, completions, members, and accounts</strong> associated with this household.
                  Everyone will be signed out and removed. There is no undo.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Type <span className="font-mono font-bold text-slate-700">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-40 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
