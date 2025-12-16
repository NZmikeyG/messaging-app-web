'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { useUserPresenceList } from '@/hooks/usePresence'
import { supabase } from '@/lib/supabase/client'

import {
  getConversations,
  type Conversation,
} from '@/lib/supabase/directMessages'

export default function DirectMessagesPage() {
  const router = useRouter()
  const { profile } = useUserStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { presenceList, loading: presenceLoading } = useUserPresenceList()

  const fetchConversations = useCallback(async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      const data = await getConversations(profile.id)
      setConversations(data)
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
    if (profile?.id) {
      fetchConversations()
    }
  }, [fetchConversations, profile?.id])

  const getUserPresence = (userId: string) => {
    const presence = presenceList.find((p) => p.user_id === userId)
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
                          className={`w-2 h-2 rounded-full inline-block ${presenceLoading
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
                      {conv.last_message_content || 'No messages'}
                    </p>
                  </div>

                  <div className="shrink-0 ml-4 text-xs text-gray-500 group-hover:text-gray-400">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleDateString()
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
