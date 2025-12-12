'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { useUserPresenceList } from '@/hooks/usePresence'
import { supabase } from '@/lib/supabase/client'

interface DirectMessageConversation {
  id: string
  other_user_id: string
  last_message?: string
  last_message_time?: string
  other_user?: {
    id: string
    username: string
    email: string
  }
}

export default function DirectMessagesPage() {
  const router = useRouter()
  const { profile } = useUserStore()
  const [conversations, setConversations] = useState<DirectMessageConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { presenceList, loading: presenceLoading } = useUserPresenceList()

  const fetchConversations = useCallback(async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      console.log('📥 Fetching conversations for user:', profile.id)

      // Query for messages where user is sender
      const { data: sentData, error: sentError } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false })

      if (sentError) {
        console.error('❌ Error fetching sent messages:', sentError)
      }

      // Query for messages where user is recipient
      const { data: receivedData, error: receivedError } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })

      if (receivedError) {
        console.error('❌ Error fetching received messages:', receivedError)
      }

      // Combine messages
      const allMessages = [...(sentData || []), ...(receivedData || [])]

      if (allMessages.length === 0) {
        setConversations([])
        return
      }

      // Group conversations
      const conversationMap = new Map<string, DirectMessageConversation>()

      for (const msg of allMessages) {
        const otherUserId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id

        const key = [profile.id, otherUserId].sort().join('-')

        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            id: key,
            other_user_id: otherUserId,
            last_message: msg.content,
            last_message_time: msg.created_at,
            other_user: {
              id: otherUserId,
              username: 'Loading...',
              email: 'Loading...',
            },
          })
        }
      }

      // ✅ FIXED: Fetch user data (username, email) from 'users' table
      const conversationsWithEmails = await Promise.all(
        Array.from(conversationMap.values()).map(async (conv) => {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, username')
              .eq('id', conv.other_user_id)
              .single()

            if (!userError && userData) {
              conv.other_user!.username = userData.username || userData.email
              conv.other_user!.email = userData.email
            }
          } catch (e) {
            console.warn(`Failed to fetch user ${conv.other_user_id}:`, e)
          }
          return conv
        })
      )

      setConversations(conversationsWithEmails)
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load conversations'
      console.error('❌ Error:', errorMsg)
      setError(errorMsg)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const getUserPresence = (userId: string) => {
    const presence = presenceList.find((p) => p.user_id === userId)
    console.log(`🔍 Checking presence for ${userId}:`, presence)
    return presence
  }

  if (!profile?.id) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <p className="text-gray-400">Please log in to view messages</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4 bg-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Direct Messages</h1>
            <p className="text-xs text-gray-400 mt-1">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => {
              console.log('📝 [DM] New message button clicked')
              router.push('/dashboard/dm')
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition shrink-0 whitespace-nowrap ml-4"
            title="Start a new conversation"
          >
            + New Message
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <p className="text-red-400 text-center">{error}</p>
            <button
              onClick={() => fetchConversations()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {conversations.map((conv) => {
              const otherUser = conv.other_user
              const presence = getUserPresence(otherUser?.id || '')
              const isOnline = presence?.is_online ?? false

              console.log(`🟢 Conv: ${otherUser?.username} | Presence: ${presence ? 'YES' : 'NO'} | Online: ${isOnline}`)

              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/dashboard/dm/${otherUser?.id}`)}
                  className="w-full text-left p-4 hover:bg-neutral-800 transition flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium truncate">
                        {otherUser?.username || otherUser?.email || 'Unknown'}
                      </h3>
                      <div className="shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full inline-block ${
                            presenceLoading
                              ? 'bg-gray-400'
                              : isOnline
                                ? 'bg-green-400'
                                : 'bg-gray-500'
                          }`}
                          title={
                            presenceLoading
                              ? 'loading...'
                              : isOnline
                                ? 'Online'
                                : 'Offline'
                          }
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 truncate mt-1">
                      {conv.last_message || 'No messages'}
                    </p>
                  </div>

                  <div className="shrink-0 ml-4 text-xs text-gray-500 group-hover:text-gray-400">
                    {conv.last_message_time
                      ? new Date(conv.last_message_time).toLocaleDateString()
                      : '-'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
