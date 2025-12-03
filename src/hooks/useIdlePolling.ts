// src/hooks/useIdlePolling.ts
'use client'

import { useEffect, useRef } from 'react'

export function useIdlePolling(
  callback: () => void,
  activeInterval: number = 5000,
  idleInterval: number = 30000,
  enabled: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isIdleRef = useRef<boolean>(false)

  useEffect(() => {
    // If disabled completely, clear everything and stop
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      console.log('🔌 [IDLE POLLING] Disabled completely')
      return
    }

    console.log('🟢 [IDLE POLLING] Enabled - polling every 5 seconds')

    // Track activity - user interaction
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (isIdleRef.current) {
        console.log('👤 [IDLE POLLING] User activity detected - resuming active polling')
        isIdleRef.current = false
      }
    }

    // Handle tab focus - don't trigger route changes
    const handleFocus = () => {
      console.log('👁️ [IDLE POLLING] Tab focused - resuming activity')
      lastActivityRef.current = Date.now()
      if (isIdleRef.current) {
        isIdleRef.current = false
      }
    }

    // Add activity listeners
    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('scroll', handleActivity, { passive: true })
    window.addEventListener('focus', handleFocus, { passive: true })

    // Main polling loop
    const runPolling = () => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current

      // After 2 minutes of inactivity, switch to idle polling
      if (timeSinceLastActivity > 120000 && !isIdleRef.current) {
        console.log('💤 [IDLE POLLING] No activity for 2 minutes - switching to idle polling (30s intervals)')
        isIdleRef.current = true
      }

      // Always call the callback - NEVER SKIP
      callback()

      // Schedule next poll with appropriate interval
      const nextInterval = isIdleRef.current ? idleInterval : activeInterval
      intervalRef.current = setTimeout(runPolling, nextInterval)
    }

    // Start polling immediately
    runPolling()

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('focus', handleFocus)

      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }

      console.log('🛑 [IDLE POLLING] Cleanup - polling stopped')
    }
  }, [callback, activeInterval, idleInterval, enabled])
}
