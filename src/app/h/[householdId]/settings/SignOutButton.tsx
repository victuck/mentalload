'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full text-left text-sm text-rose-600 hover:text-rose-700 font-medium transition-colors"
    >
      Sign out
    </button>
  )
}
