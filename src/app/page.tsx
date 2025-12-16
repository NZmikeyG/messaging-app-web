'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url: string | null
  bio: string | null
}

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (data) {
            setProfile(data as UserProfile)
            router.push('/dashboard')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-r from-blue-500 via-purple-500 to-pink-500">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-6">Messaging App</h1>
        <p className="text-xl mb-8 opacity-90">
          Connect with your team in real-time
        </p>
        <div className="space-x-4">
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
