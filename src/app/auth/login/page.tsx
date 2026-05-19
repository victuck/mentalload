'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setVerifying(true)

    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) {
      setError(error.message)
      setVerifying(false)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      router.push(next)
      return
    }

    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', data.user!.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      router.push(`/h/${memberships[0].household_id}/today`)
    } else {
      router.push('/onboarding')
    }
  }

  const card = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-4">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">MentalLoad</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in with a one-time code</p>
      </div>
      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}
      {!sent ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-slate-500 text-sm text-center">
            We sent a 6-digit code to <strong className="text-slate-700">{email}</strong>.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium text-slate-700">Code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              required
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || code.length < 6}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => { setSent(false); setCode(''); setError(null) }}
            className="w-full text-slate-500 text-sm hover:text-slate-700"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  )

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      {card}
    </main>
  )
}
