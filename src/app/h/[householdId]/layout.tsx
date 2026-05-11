import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReconnectIndicator } from '@/components/ReconnectIndicator'
import { RealtimeSync } from '@/components/RealtimeSync'

export default async function HouseholdLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ householdId: string }>
}) {
  const { householdId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .single()

  if (!household) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">{household.name}</h1>
        <Link href={`/h/${householdId}/settings`} className="text-sm text-gray-500 hover:text-gray-700">
          Settings
        </Link>
      </header>
      <nav className="bg-white border-b flex">
        <Link
          href={`/h/${householdId}/today`}
          className="flex-1 text-center py-3 text-sm font-medium border-b-2 hover:text-indigo-600"
        >
          Today
        </Link>
        <Link
          href={`/h/${householdId}/balance`}
          className="flex-1 text-center py-3 text-sm font-medium border-b-2 hover:text-indigo-600"
        >
          Balance
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto p-4">{children}</main>
      <RealtimeSync householdId={householdId} />
      <ReconnectIndicator />
    </div>
  )
}
