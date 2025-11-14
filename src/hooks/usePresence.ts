import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useUserStore, type UserPresence } from '@/store/useUserStore'
import React from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const usePresence = (userId: string | undefined) => {
  const { setPresence, setError } = useUserStore()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)

  useEffect(() => {
    if (!userId) return

    // Initial presence update
    const updatePresence = async () => {
      try {
        const { error } = await supabase
          .from('user_presence')
          .upsert(
            {
              user_id: userId,
              is_online: true,
              last_seen: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (error) throw error

        setPresence({
          user_id: userId,
          is_online: true,
          last_seen: new Date().toISOString(),
        } as UserPresence)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update presence'
        setError(message)
        console.error('Error updating presence:', err)
      }
    }

    // Update immediately
    updatePresence()

    // Set up heartbeat - update every 30 seconds
    heartbeatIntervalRef.current = setInterval(updatePresence, 30000)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      // Mark user as offline
      if (!isCleaningUpRef.current) {
        isCleaningUpRef.current = true

        const markOffline = async () => {
          try {
            await supabase
              .from('user_presence')
              .update({
                is_online: false,
                last_seen: new Date().toISOString(),
              })
              .eq('user_id', userId)
          } catch (err) {
            console.error('Error marking offline:', err)
          } finally {
            isCleaningUpRef.current = false
          }
        }

        markOffline()
      }
    }
  }, [userId, setPresence, setError])
}

// Hook to get other users' presence
export const useUserPresenceList = () => {
  const [presenceList, setPresenceList] = React.useState<UserPresence[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchPresenceList = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_presence')
        .select('*')
        .order('last_seen', { ascending: false })

      if (fetchError) throw fetchError

      setPresenceList((data as unknown as UserPresence[]) ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch presence list'
      setError(message)
      console.error('Error fetching presence list:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPresenceList()

    // Subscribe to real-time presence changes
    const subscription = supabase
      .channel('user_presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setPresenceList((prev) => {
              const index = prev.findIndex((p) => p.user_id === (payload.new as UserPresence).user_id)
              if (index > -1) {
                return [
                  ...prev.slice(0, index),
                  payload.new as UserPresence,
                  ...prev.slice(index + 1),
                ]
              }
              return [payload.new as UserPresence, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchPresenceList])

  return { presenceList, loading, error }
}
