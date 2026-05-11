'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function ReconnectIndicator() {
  const [disconnected, setDisconnected] = useState(false)

  useEffect(() => {
    const channel = supabase.channel('system')
    channel
      .on('system', { event: 'disconnect' }, () => setDisconnected(true))
      .on('system', { event: 'reconnect' }, () => setDisconnected(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!disconnected) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-4 py-2 rounded-full shadow">
      Reconnecting...
    </div>
  )
}
