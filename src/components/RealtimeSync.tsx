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
