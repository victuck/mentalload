import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // preserved from login ?next= param

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // If there's a next param (e.g. a join link), go there first
      // Guard against protocol-relative URLs like //evil.com that start with /
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Check if user has a household
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', data.user.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        return NextResponse.redirect(`${origin}/h/${memberships[0].household_id}/today`)
      }
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
