'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { UserPresence } from '@/types'

export const useRealtimeSubscription = () => {
  const [presenceList, setPresenceList] = useState<UserPresence[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const fetchPresenceList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .order('last_seen', { ascending: false })

      if (error) {
        console.error('Error fetching presence:', error)
        return
      }

      setPresenceList(data || [])
    } catch (err) {
      console.error('Exception fetching presence:', err)
    }
  }, [])

  useEffect(() => {
    // Subscribe to user_presence table changes
    const presenceChannel = supabase
      .channel('user_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload: any) => {
          console.log('Presence update:', payload)

          if (
            payload.eventType === 'UPDATE' ||
            payload.eventType === 'INSERT'
          ) {
            setPresenceList((prev) => {
              const newPresence = payload.new as UserPresence
              const index = prev.findIndex(
                (p) => p.user_id === newPresence.user_id
              )

              if (index > -1) {
                // Update existing user
                const updated = [...prev]
                updated[index] = newPresence
                return updated
              }
              // Add new user
              return [newPresence, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setPresenceList((prev) =>
              prev.filter(
                (p) => p.user_id !== (payload.old as UserPresence).user_id
              )
            )
          }
        }
      )
      .subscribe((status: any) => {
        console.log('Presence channel status:', status)
      })

    setChannel(presenceChannel)

    // Initial fetch
    fetchPresenceList()

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [fetchPresenceList])

  return { presenceList, channel }
}
