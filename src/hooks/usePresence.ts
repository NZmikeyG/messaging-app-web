'use client'

import { useEffect, useRef, useState } from 'react'
import { useUserStore, type UserPresence } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Helper function for proper error logging
 * CRITICAL FIX #4: Properly extract and log error messages
 */
const logPresenceError = (context: string, error: unknown) => {
  if (error instanceof Error) {
    console.error(`❌ [PRESENCE] ${context}:`, error.message)
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    const err = error as any
    console.error(
      `❌ [PRESENCE] ${context}:`,
      JSON.stringify({ message: err.message, code: err.code }, null, 2)
    )
  } else if (typeof error === 'string') {
    console.error(`❌ [PRESENCE] ${context}:`, error)
  } else {
    console.error(`❌ [PRESENCE] ${context}:`, String(error))
  }
}

/**
 * Hook to manage current user's presence status
 * CRITICAL FIX #3: Proper initialization and error handling
 * Updates presence once on mount, cleans up on unmount
 */
export const usePresence = (userId: string | undefined) => {
  const { setPresence, setError } = useUserStore()
  const [mounted, setMounted] = useState(false)
  const isCleaningUpRef = useRef(false)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // One-time: Mark online when component mounts
  useEffect(() => {
    // CRITICAL FIX: Return early if no userId
    if (!userId) {
      console.log('⚠️ [PRESENCE] No userId provided, skipping presence update')
      return
    }

    if (mounted) return

    let isMounted = true

    const initializePresence = async () => {
      try {
        console.log('✅ [PRESENCE] Initializing for userId:', userId)

        const now = new Date().toISOString()

        // CRITICAL FIX: Check for error BEFORE throwing
        const { error: upsertError, data } = await supabase
          .from('user_presence')
          .upsert(
            {
              user_id: userId,
              is_online: true,
              last_seen: now,
              status: 'online',
            },
            { onConflict: 'user_id' }
          )

        if (upsertError) {
          logPresenceError('Supabase upsert failed', upsertError)
          throw new Error(upsertError.message || 'Unknown upsert error')
        }

        console.log('✅ [PRESENCE] Presence updated successfully for:', userId)

        if (isMounted) {
          setMounted(true)
          setPresence({
            user_id: userId,
            is_online: true,
            last_seen: now,
            status: 'online',
          } as UserPresence)
        }
      } catch (err) {
        // CRITICAL FIX: Properly extract error message
        const errorMessage =
          err instanceof Error ? err.message : String(err) || 'Unknown error'
        console.error(
          '❌ [PRESENCE] Error updating presence:',
          errorMessage
        )
        logPresenceError('Presence initialization failed', err)
        if (isMounted) {
          setError(errorMessage)
        }
      }
    }

    // Small delay to ensure auth is ready
    initTimeoutRef.current = setTimeout(initializePresence, 100)

    // Cleanup: Mark offline on unmount
    return () => {
      isMounted = false

      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
        initTimeoutRef.current = null
      }

      if (!isCleaningUpRef.current) {
        isCleaningUpRef.current = true

        const markOffline = async () => {
          try {
            const now = new Date().toISOString()
            console.log('🔴 [PRESENCE] Marking offline on unmount:', userId)

            const { error: updateError } = await supabase
              .from('user_presence')
              .update({
                is_online: false,
                last_seen: now,
                status: 'offline',
              })
              .eq('user_id', userId)

            if (updateError) {
              console.warn(
                '⚠️ [PRESENCE] Offline error (non-critical):',
                updateError.message
              )
            } else {
              console.log('✅ [PRESENCE] Marked offline successfully')
            }
          } catch (err) {
            console.error('❌ [PRESENCE] Cleanup error:', err)
          } finally {
            isCleaningUpRef.current = false
          }
        }

        markOffline()
      }
    }
  }, [userId, mounted, setPresence, setError])
}

/**
 * Hook to get and subscribe to all users' presence
 * CRITICAL FIX #2: Proper cleanup of subscriptions
 * Provides real-time updates via Supabase subscriptions
 */
export const useUserPresenceList = () => {
  const [presenceList, setPresenceList] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let isMounted = true

    // Initial fetch
    const fetchPresenceList = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('🔵 [PRESENCE LIST] Initial fetch...')

        const { data, error: fetchError } = await supabase
          .from('user_presence')
          .select('*')
          .eq('is_online', true)
          .order('last_seen', { ascending: false })

        if (fetchError) {
          logPresenceError('[PRESENCE LIST] Fetch error', fetchError)
          throw fetchError
        }

        const typedData = (data as unknown as UserPresence[]) ?? []

        if (isMounted) {
          console.log(
            '✅ [PRESENCE LIST] Fetched:',
            typedData.length,
            'users online'
          )
          setPresenceList(typedData)
          setError(null)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch presence list'
        if (isMounted) {
          setError(message)
          logPresenceError('[PRESENCE LIST] Fetch failed', err)
          setPresenceList([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPresenceList()

    // Setup real-time subscription
    const setupSubscription = () => {
      console.log('📡 [PRESENCE LIST] Setting up subscription...')

      subscriptionRef.current = supabase
        .channel('public:user_presence:real-time', {
          config: {
            broadcast: { self: true },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
          },
          (payload: any) => {
            if (!isMounted) return

            console.log('🔄 [PRESENCE LIST] Event:', payload.eventType)

            const newData = payload.new as UserPresence
            const oldData = payload.old as UserPresence

            setPresenceList((prev) => {
              if (
                payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE'
              ) {
                if (newData.is_online) {
                  // User is online - add or update
                  const index = prev.findIndex(
                    (p) => p.user_id === newData.user_id
                  )
                  if (index >= 0) {
                    const updated = [...prev]
                    updated[index] = newData
                    return updated
                  } else {
                    return [...prev, newData]
                  }
                } else {
                  // User went offline - remove
                  return prev.filter((p) => p.user_id !== newData.user_id)
                }
              } else if (payload.eventType === 'DELETE') {
                return prev.filter((p) => p.user_id !== oldData.user_id)
              }
              return prev
            })
          }
        )
        .subscribe((status: string) => {
          console.log('📡 [PRESENCE LIST] Subscription status:', status)
          if (status === 'CLOSED') {
            console.log(
              '⚠️ [PRESENCE LIST] Subscription closed, reconnecting in 3s...'
            )
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
              reconnectTimeoutRef.current = null
            }
            reconnectTimeoutRef.current = setTimeout(setupSubscription, 3000)
          } else if (status === 'SUBSCRIBED') {
            console.log('✅ [PRESENCE LIST] Subscription active')
          }
        })
    }

    setupSubscription()

    // CRITICAL FIX #2: Proper cleanup of subscriptions and timeouts
    return () => {
      isMounted = false
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [])

  return { presenceList, loading, error }
}

/**
 * Hook to get single user presence with real-time updates
 * CRITICAL FIX #2: Proper cleanup of subscriptions
 */
export const useUserPresence = (userId: string | undefined) => {
  const [presence, setPresence] = useState<UserPresence | null>(null)
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) {
      console.log('⚠️ [USER PRESENCE] No userId provided')
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchPresence = async () => {
      try {
        console.log('🔵 [USER PRESENCE] Fetching:', userId)

        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error) {
          console.warn('⚠️ [USER PRESENCE] Not found:', error.message)
          if (isMounted) {
            setPresence(null)
            setLoading(false)
          }
          return
        }

        if (isMounted) {
          console.log('✅ [USER PRESENCE] Fetched successfully')
          setPresence(data as UserPresence)
          setLoading(false)
        }
      } catch (err) {
        console.error('❌ [USER PRESENCE] Fetch error:', err)
        if (isMounted) {
          setPresence(null)
          setLoading(false)
        }
      }
    }

    fetchPresence()

    // Subscribe to changes
    subscriptionRef.current = supabase
      .channel(`user_presence:${userId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (!isMounted) return

          console.log('🔄 [USER PRESENCE] Event:', payload.eventType)

          if (payload.eventType === 'DELETE') {
            console.log('➖ [USER PRESENCE] Presence deleted')
            setPresence(null)
          } else {
            console.log('✅ [USER PRESENCE] Presence updated')
            setPresence(payload.new as UserPresence)
          }
        }
      )
      .subscribe((status: string) => {
        console.log('📡 [USER PRESENCE] Subscription status:', status)
      })

    // CRITICAL FIX #2: Proper cleanup
    return () => {
      isMounted = false
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [userId])

  return { presence, loading }
}

/**
 * Hook to get presence status string for UI
 */
export const usePresenceStatus = (userId: string | undefined) => {
  const { presence, loading } = useUserPresence(userId)

  if (loading) return 'loading'
  if (!presence) return 'offline'
  if (presence.is_online) return 'online'
  return 'offline'
}