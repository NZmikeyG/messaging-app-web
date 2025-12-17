'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { usePresence, useUserPresenceList } from '@/hooks/usePresence'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, setProfile } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)

  // Call hooks at top level - NEVER conditionally
  const { presenceList } = useUserPresenceList()

  // Use presence hook for current user (handles undefined safely)
  usePresence(profile?.id)

  // Initialize and fetch profile
  useEffect(() => {
    let isMounted = true

    const initializeDashboard = async () => {
      try {
        console.log('🔵 [DASHBOARD] Initializing...')
        setLoading(true)
        setError(null)

        // Get current user from auth
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error('❌ [DASHBOARD] Auth error:', authError)
          if (isMounted) {
            setError('Not authenticated')
            router.push('/auth/login')
          }
          return
        }

        console.log('✅ [DASHBOARD] Authenticated user:', user.id)

        // Fetch user profile from users table
        console.log('📥 [DASHBOARD] Fetching profile for:', user.email)

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, username, avatar_url, status')
          .eq('id', user.id)
          .maybeSingle()

        if (userError && !userError.message.includes('no rows')) {
          console.error('❌ [DASHBOARD] User fetch error:', userError)
          throw userError
        }

        if (!userData) {
          console.error('❌ [DASHBOARD] No user profile found')
          if (isMounted) {
            setError('Profile not found')
            return
          }
        }

        console.log('✅ [DASHBOARD] Got profile:', userData)

        // Update store with properly typed Profile
        if (isMounted && userData) {
          setProfile({
            id: userData.id,
            email: userData.email,
            username: userData.username || userData.email?.split('@')[0] || 'User',
            avatar_url: userData.avatar_url || null,
            theme: 'dark',
            notifications_enabled: true,
            timezone: 'UTC',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('❌ [DASHBOARD] Exception:', err)
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to initialize dashboard'
          setError(errorMsg)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeDashboard()

    return () => {
      isMounted = false
    }
  }, [setProfile, router])

  // Fetch messages from general channel
  useEffect(() => {
    let isMounted = true

    const fetchMessages = async () => {
      try {
        console.log('📥 [MESSAGES] Fetching from general channel...')

        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (messagesError) {
          console.warn('⚠️ [MESSAGES] Fetch error:', messagesError)
          return
        }

        if (isMounted && messagesData) {
          console.log('✅ [MESSAGES] Got', messagesData.length, 'messages')
          setMessages(messagesData.reverse()) // Show oldest first
        }
      } catch (err) {
        console.error('❌ [MESSAGES] Exception:', err)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('public:messages', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          console.log('📨 [MESSAGES] New message:', payload.new.id)
          if (isMounted) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
    }
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageContent.trim() || !profile) {
      console.warn('⚠️ Missing required fields')
      return
    }

    try {
      setSending(true)
      const content = messageContent.trim()
      console.log('📤 [SEND] Sending message:', content)

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          user_id: profile.id,
          content: content,
          channel_id: 'general', // Default to general channel
        })
        .select()
        .single()

      if (sendError) {
        console.error('❌ [SEND] Error:', sendError)
        throw sendError
      }

      console.log('✅ [SEND] Message sent:', data.id)
      setMessageContent('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      console.error('❌ [SEND] Exception:', errorMsg)
      setError(errorMsg)
    } finally {
      setSending(false)
    }
  }

  // ... (keep useEffect for auth/profile initialization) ...

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 p-6 rounded max-w-md">
          <h2 className="text-red-100 font-bold mb-2">Dashboard Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-8 bg-gray-900 text-white h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full">
        {/* Welcome Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Welcome back, {profile?.username || 'User'}!
          </h1>
          <p className="text-gray-400 text-lg">
            What would you like to do today?
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Channels Card */}
          <button
            onClick={() => router.push('/dashboard/channels')} // Assuming this route exists or we direct to first channel
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">💬</span>
            </div>
            <div className="mb-4 text-blue-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition">Channels</h3>
            <p className="text-gray-400 text-sm">
              Catch up on team discussions and project updates in your channels.
            </p>
          </button>

          {/* DMs Card */}
          <button
            onClick={() => router.push('/dashboard/dm')}
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">📧</span>
            </div>
            <div className="mb-4 text-purple-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition">Direct Messages</h3>
            <p className="text-gray-400 text-sm">
              Private conversations with your colleagues and team members.
            </p>
          </button>

          {/* Calendar Card (Not Implemented) */}
          <button
            onClick={() => alert('Calendar feature coming soon!')}
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">📅</span>
            </div>
            <div className="mb-4 text-green-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-green-400 transition">Calendar</h3>
            <p className="text-gray-400 text-sm">
              Schedule meetings and view upcoming team events.
            </p>
            <span className="absolute bottom-4 right-4 text-xs bg-gray-900 border border-gray-600 px-2 py-1 rounded text-gray-400">
              Coming Soon
            </span>
          </button>

          {/* Files Card */}
          <button
            onClick={() => alert('Files feature coming soon!')}
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">📁</span>
            </div>
            <div className="mb-4 text-orange-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-orange-400 transition">Files</h3>
            <p className="text-gray-400 text-sm">
              Manage and share files with your team securely.
            </p>
            <span className="absolute bottom-4 right-4 text-xs bg-gray-900 border border-gray-600 px-2 py-1 rounded text-gray-400">
              Coming Soon
            </span>
          </button>

          {/* Apps Card */}
          <button
            onClick={() => alert('Apps feature coming soon!')}
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-pink-500 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">📦</span>
            </div>
            <div className="mb-4 text-pink-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-pink-400 transition">Apps</h3>
            <p className="text-gray-400 text-sm">
              Integrate with your favorite tools and services.
            </p>
            <span className="absolute bottom-4 right-4 text-xs bg-gray-900 border border-gray-600 px-2 py-1 rounded text-gray-400">
              Coming Soon
            </span>
          </button>

          {/* Settings Card */}
          <button
            onClick={() => alert('Settings feature coming soon!')}
            className="group relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-500/20 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <span className="text-6xl">⚙️</span>
            </div>
            <div className="mb-4 text-gray-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-gray-300 transition">Settings</h3>
            <p className="text-gray-400 text-sm">
              Manage your profile, notifications, and preferences.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}
