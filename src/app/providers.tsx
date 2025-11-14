'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'

export function Providers({ children }: { children: React.ReactNode }) {
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const { setError } = useUserStore()

  useEffect(() => {
    // Initialize session on app load
    const initSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (data.session?.user) {
          localStorage.setItem('session', JSON.stringify(data.session))
        }
      } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Failed to initialize session'
        setError(message)
        console.error('Failed to initialize session:', error)
      } finally {
        setIsSessionLoading(false)
      }
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (session) {
          localStorage.setItem('session', JSON.stringify(session))
        } else {
          localStorage.removeItem('session')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [setError])

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
