'use client'

import { X, Scale } from 'lucide-react'

export const WELCOME_STORAGE_KEY = 'ml_welcome_seen'

interface Props {
  onClose: () => void
  showRevisitHint?: boolean
}

export function WelcomeModal({ onClose, showRevisitHint = true }: Props) {
  function handleClose() {
    localStorage.setItem(WELCOME_STORAGE_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 w-full max-w-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Scale size={20} className="text-white" />
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
            Stop carrying the family to-do list in your head.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            This app helps families share the mental load by turning invisible tasks into a clear, shared plan. From household chores and life admin to children&apos;s milestones and seasonal reminders, we&apos;ll help you stay one step ahead.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Build your family&apos;s task list with personalised suggestions, assign ownership, and track how responsibilities are shared. Our Balance tab shows each person&apos;s contribution based on both effort and frequency, helping create a fairer, more transparent division of work.
          </p>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Less remembering. Less reminding. More teamwork.
          </p>
        </div>
        {showRevisitHint && <p className="text-xs text-slate-400">You can revisit this any time using the ? button.</p>}
      </div>
    </div>
  )
}
