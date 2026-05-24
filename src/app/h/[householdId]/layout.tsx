import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings2, Scale } from 'lucide-react'
import { ReconnectIndicator } from '@/components/ReconnectIndicator'
import { RealtimeSync } from '@/components/RealtimeSync'
import { HelpButton } from '@/components/HelpButton'
import { NavTabs } from './NavTabs'

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Scale size={14} className="text-white" />
          </div>
          <h1 className="font-semibold text-slate-900">{household.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton />
          <Link
            href={`/h/${householdId}/settings`}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100"
            aria-label="Settings"
          >
            <Settings2 size={18} />
          </Link>
        </div>
      </header>
      <NavTabs householdId={householdId} />
      <main className="max-w-2xl mx-auto p-4 pt-6">{children}</main>
      <RealtimeSync householdId={householdId} />
      <ReconnectIndicator />
    </div>
  )
}
