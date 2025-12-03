'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import {
  getMessages,
  sendDirectMessage,
  subscribeToMessages,
  type DirectMessage,
} from '@/lib/supabase/directMessages'
import { supabase } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  username?: string
  status?: string
}

export default function DMConversation({
  recipientId,
  recipientName,
  recipientStatus,
}: {
  recipientId: string
  recipientName: string
  recipientStatus: string
}) {
  const { profile: currentUser } = useUserStore()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const loadedRef = useRef(false)

  // Fetch recipient user info once on mount
  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        if (!recipientId) {
          setError('No user selected')
          return
        }

        console.log('🔵 Fetching user profile:', recipientId)

        // Fetch from users table
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, email, username, status')
          .eq('id', recipientId)
          .single()

        if (fetchError) {
          console.error('❌ Error fetching user:', fetchError)
          // Fallback to profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('id', recipientId)
            .single()

          if (profileData) {
            setOtherUser({
              id: profileData.id,
              email: profileData.email,
              status: 'offline',
            } as UserProfile)
          }
          return
        }

        console.log('✅ User fetched:', data)
        setOtherUser(data as UserProfile)
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load user profile'
        console.error('❌ Error:', errorMsg)
        setError(errorMsg)
      }
    }

    fetchOtherUser()
  }, [recipientId])

  // Load messages and subscribe - only once on mount
  useEffect(() => {
    if (!currentUser?.id || !recipientId || loadedRef.current) return

    loadedRef.current = true

    const setupMessages = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('📥 Fetching messages between:', currentUser.id, recipientId)

        // Load initial messages
        const data = await getMessages(currentUser.id, recipientId)
        console.log('✅ Messages fetched:', data?.length ?? 0)
        setMessages(data ?? [])

        setLoading(false)

        // Subscribe to new messages (polling-based)
        const subscription = subscribeToMessages(
          currentUser.id,
          recipientId,
          (newMessage) => {
            console.log('🔔 New message received:', newMessage)
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        )

        subscriptionRef.current = subscription
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load messages'
        console.error('❌ Error:', errorMsg)
        setError(errorMsg)
        setMessages([])
        setLoading(false)
      }
    }

    setupMessages()

    // Cleanup subscription on unmount ONLY
    return () => {
      if (subscriptionRef.current) {
        console.log('🔌 Unsubscribing from messages')
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      loadedRef.current = false
    }
  }, [currentUser?.id, recipientId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageContent.trim() || !currentUser?.id || !recipientId) return

    try {
      setSending(true)
      console.log('📤 Sending message...')

      await sendDirectMessage(currentUser.id, recipientId, messageContent)

      console.log('✅ Message sent!')
      setMessageContent('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send'
      console.error('❌ Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {otherUser?.username || otherUser?.email || recipientName || 'User'}
            </h2>
            <p className="text-sm text-gray-400">
              {otherUser?.status === 'online' ? (
                <span className="text-green-400">● Online</span>
              ) : (
                <span className="text-gray-500">● Offline</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-900 text-red-100 rounded mb-4">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-400 pt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUser?.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-purple-600 text-white'
                      : 'bg-neutral-700 text-gray-100'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-purple-200' : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-neutral-800 p-4 bg-neutral-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-neutral-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageContent.trim() || sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
