'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import type { Channel } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const { getChannels } = useSupabase()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router])

  // Load channel details when selected
  useEffect(() => {
    const loadChannel = async () => {
      if (!selectedChannelId) return

      try {
        const channels = await getChannels()
        const channel = channels.find((c) => c.id === selectedChannelId)
        setSelectedChannel(channel || null)
      } catch (error) {
        console.error('Failed to load channel:', error)
      }
    }

    loadChannel()
  }, [selectedChannelId, getChannels])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Messaging App</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Chat Area */}
        <ChatArea
          channel={selectedChannel}
          userId={user.id}
          userEmail={user.email}
        />
      </div>
    </div>
  )
}
