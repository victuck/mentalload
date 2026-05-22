'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const LOGO = (
  <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-4">
    <span className="text-white font-bold text-xl">M</span>
  </div>
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (error) { setError(error.message); setLoading(false); return }

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

    router.push(
      memberships && memberships.length > 0
        ? `/h/${memberships[0].household_id}/today`
        : '/onboarding'
    )
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
          <div className="text-center mb-8">
            {LOGO}
            <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
            <p className="text-slate-500 text-sm mt-1">
              We sent a 6-digit code to <strong className="text-slate-700">{email}</strong>
            </p>
          </div>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setSent(false); setCode(''); setError(null) }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Use a different email
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          {LOGO}
          <h1 className="text-2xl font-bold text-slate-900">MentalLoad</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in with a one-time code</p>
        </div>
        <form onSubmit={handleRequestCode} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </div>
    </main>
  )
}
