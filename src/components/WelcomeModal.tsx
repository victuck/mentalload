'use client'

import { X } from 'lucide-react'

export const WELCOME_STORAGE_KEY = 'ml_welcome_seen'

interface Props {
  onClose: () => void
}

export function WelcomeModal({ onClose }: Props) {
  function handleClose() {
    localStorage.setItem(WELCOME_STORAGE_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 w-full max-w-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-slate-900 text-sm font-semibold leading-relaxed">
            This app is designed to help make the invisible mental load in your household visible.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Add your household's recurring tasks and assign them to whoever owns them. The Balance tab shows each person's share as a percentage, weighted by how often tasks recur and how much effort they take. When someone does a task that isn't theirs, that's tracked as a pickup too.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            The goal isn't to keep score — it's to make it easier to have honest conversations about who's carrying what.
          </p>
        </div>
        <p className="text-xs text-slate-400">You can revisit this any time using the ? button.</p>
      </div>
    </div>
  )
}
