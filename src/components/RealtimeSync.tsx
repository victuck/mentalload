'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  householdId: string
}

const supabase = createClient()

export function RealtimeSync({ householdId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`household:${householdId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `household_id=eq.${householdId}`,
      }, () => router.refresh())
      // task_completions cannot be filtered by household_id at the channel level
      // (no FK shortcut in Realtime filters). RLS ensures data security; the worst
      // case is a spurious refresh when another household records a completion.
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_completions',
      }, () => router.refresh())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, router])

  return null
}
