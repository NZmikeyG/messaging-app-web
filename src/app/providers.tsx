'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize session on app load
    const initSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      
      // Persist session to localStorage for recovery
      if (data?.session) {
        localStorage.setItem('sb-session', JSON.stringify(data.session))
      }
    }

    initSession()
    setMounted(true)

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          localStorage.setItem('sb-session', JSON.stringify(session))
        } else {
          localStorage.removeItem('sb-session')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}