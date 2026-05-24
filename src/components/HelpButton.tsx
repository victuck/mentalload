'use client'

import { useState, useEffect } from 'react'
import { WelcomeModal } from './WelcomeModal'

export function HelpButton() {
  const [open, setOpen] = useState(false)

  // suppress hydration mismatch — localStorage is client-only
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full border border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center text-xs font-semibold transition-colors"
        aria-label="Help"
      >
        ?
      </button>
      {open && <WelcomeModal onClose={() => setOpen(false)} />}
    </>
  )
}
