'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import type { Conversation } from '@/lib/supabase/directMessages'
import { getConversations } from '@/lib/supabase/directMessages'
import { useUserPresenceList } from '@/hooks/usePresence'
import { useIdlePolling } from '@/hooks/useIdlePolling'
import Link from 'next/link'

interface DirectMessagesListProps {
  onNewMessage: () => void
}

export default function DirectMessagesList({
  onNewMessage,
}: DirectMessagesListProps) {
  const pathname = usePathname()
  const { profile } = useUserStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { presenceList } = useUserPresenceList()

  // Memoized conversation loader
  const loadConversations = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      console.log('📥 Loading conversations...')
      const data = await getConversations(profile.id)
      setConversations(data.slice(0, 5))

      if (data.length > 0) {
        onNewMessage()
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, onNewMessage])

  // Initial load - one time on mount
  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    loadConversations()
  }, [profile?.id, loadConversations])

  // Check if in DM conversation
  const inDMConversation =
    typeof pathname === 'string' &&
    pathname.startsWith('/dashboard/dm/') &&
    pathname !== '/dashboard/dm'

  // Use idle polling - DISABLED when in a conversation
  useIdlePolling(
    loadConversations,
    5000, // Active: poll every 5 seconds (instant updates)
    30000, // Idle: poll every 30 seconds (battery friendly)
    !inDMConversation // DISABLED in conversations, ENABLED on list
  )

  const getStatusColor = (isOnline: boolean | undefined): string => {
    return isOnline ? 'bg-green-500' : 'bg-gray-500'
  }

  const isUserOnline = (userId: string | undefined): boolean => {
    if (!userId) return false
    const presence = presenceList.find((p) => p.user_id === userId)
    return presence?.is_online ?? false
  }

  // Get display name with fallback chain
  const getDisplayName = (conversation: Conversation): string => {
    const username = conversation.other_user?.username
    const email = conversation.other_user?.email

    // Skip "Loading..." or null/undefined usernames
    if (username && username.toLowerCase() !== 'loading' && username.trim() !== '') {
      return username
    }

    // Fallback to email prefix if username is missing
    if (email) {
      return email.split('@')[0]
    }

    // Last resort
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-400">
        Loading conversations...
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-gray-400">No conversations yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 px-2">
      {conversations.map((conversation) => {
        const otherUserId = conversation.other_user?.id
        const isOnline = isUserOnline(otherUserId)
        const displayName = getDisplayName(conversation)

        return (
          <Link
            key={conversation.id}
            href={`/dashboard/dm/${otherUserId || ''}`}
            className="flex items-center gap-2 p-2 rounded hover:bg-neutral-700 transition text-sm text-gray-300 hover:text-white group"
          >
            {/* Status Indicator with Online/Offline Badge */}
            <div className="relative shrink-0">
              <div className="w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center text-xs font-medium">
                {conversation.other_user?.email?.charAt(0).toUpperCase() ||
                  '?'}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-neutral-900 ${getStatusColor(
                  isOnline
                )} transition-colors`}
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium group-hover:text-purple-400 transition-colors">
                {displayName}
              </p>
              {/* Last message timestamp */}
              <p className="text-xs text-gray-500 truncate">
                {conversation.last_message_id
                  ? new Date(conversation.last_message_at).toLocaleTimeString(
                      'en-US',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                  : 'No messages yet'}
              </p>
            </div>
          </Link>
        )
      })}

      {/* View All Link */}
      <Link
        href="/dashboard/dm"
        className="block px-2 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors text-center mt-2 border-t border-neutral-700 pt-2"
      >
        View all conversations →
      </Link>
    </div>
  )
}
