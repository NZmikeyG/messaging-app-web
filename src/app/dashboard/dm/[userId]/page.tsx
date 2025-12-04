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
import { useUserPresence } from '@/hooks/usePresence'

interface UserProfile {
  id: string
  email: string
  username?: string
  status?: string
}

export default function DMConversation() {
  const params = useParams()
  const router = useRouter()
  const { profile: currentUser } = useUserStore()
  const recipientId = params.userId as string

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)

  // Get recipient's presence status
  const { presence: recipientPresence } = useUserPresence(recipientId)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const loadedRef = useRef(false)

  console.log('🔵 RENDER - recipientId:', recipientId, 'currentUser:', currentUser?.id)

  // Fetch recipient user info with timeout
  useEffect(() => {
    if (!recipientId) {
      console.error('❌ No recipientId')
      setError('No user selected')
      return
    }

    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const fetchOtherUser = async () => {
      try {
        console.log('🔵 [USER FETCH] Starting for:', recipientId)

        // CRITICAL FIX: Add timeout to prevent infinite "Loading..." state
        timeoutId = setTimeout(() => {
          if (isMounted && !otherUser) {
            console.warn(
              '⚠️ [USER FETCH] Profile loading timeout - using fallback'
            )
            setOtherUser({
              id: recipientId,
              email: 'User',
              username: 'User',
              status: 'offline',
            } as UserProfile)
            setLoading(false)
          }
        }, 5000)

        // Try users table first
        const { data, error: err1 } = await supabase
          .from('users')
          .select('id, email, username, status')
          .eq('id', recipientId)
          .maybeSingle()

        console.log('📋 [USER FETCH] Users table result:', data, err1)

        if (data && isMounted) {
          console.log('✅ [USER FETCH] Got user from users table:', data)
          setOtherUser(data as UserProfile)
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
          return
        }

        // Try profiles table
        const { data: profileData, error: err2 } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', recipientId)
          .maybeSingle()

        console.log('📋 [USER FETCH] Profiles table result:', profileData, err2)

        if (profileData && isMounted) {
          console.log('✅ [USER FETCH] Got user from profiles table:', profileData)
          setOtherUser({
            id: profileData.id,
            email: profileData.email,
            username: profileData.email?.split('@'),
            status: 'offline',
          } as UserProfile)
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
          return
        }

        // Fallback
        if (isMounted) {
          console.log('⚠️ [USER FETCH] No user found, using fallback')
          setOtherUser({
            id: recipientId,
            email: 'User',
            username: 'User',
            status: 'offline',
          } as UserProfile)
          setLoading(false)
        }
      } catch (err) {
        console.error('❌ [USER FETCH] Exception:', err)
        if (isMounted) {
          setOtherUser({
            id: recipientId,
            email: 'User',
            username: 'User',
            status: 'offline',
          } as UserProfile)
          setLoading(false)
        }
      }
    }

    fetchOtherUser()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [recipientId])

  // Load messages and subscribe
  useEffect(() => {
    if (!currentUser?.id || !recipientId || loadedRef.current) {
      console.log('⏭️ [MESSAGES] Skipping load:', {
        hasCurrentUser: !!currentUser?.id,
        hasRecipientId: !!recipientId,
        alreadyLoaded: loadedRef.current,
      })
      return
    }

    loadedRef.current = true
    console.log('🟢 [MESSAGES] Starting message setup')

    let isMounted = true

    const setupMessages = async () => {
      try {
        setLoading(false) // Already have user by this point
        setError(null)

        console.log(
          '📥 [MESSAGES] Fetching messages between:',
          currentUser.id,
          recipientId
        )

        const data = await getMessages(currentUser.id, recipientId)
        console.log('✅ [MESSAGES] Got', data?.length ?? 0, 'messages')

        if (isMounted) {
          setMessages(data ?? [])
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 100)

        // Subscribe to new messages
        console.log('🔔 [SUBSCRIPTION] Setting up polling')
        const subscription = subscribeToMessages(
          currentUser.id,
          recipientId,
          (newMessage) => {
            console.log('📨 [SUBSCRIPTION] New message:', newMessage.id)
            if (isMounted) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMessage.id)) {
                  console.log('⚠️ Duplicate message, skipping')
                  return prev
                }
                const updated = [...prev, newMessage]
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 0)
                return updated
              })
            }
          }
        )

        subscriptionRef.current = subscription
        console.log('✅ [SUBSCRIPTION] Polling started')
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load'
        console.error('❌ [MESSAGES] Error:', errorMsg)
        if (isMounted) {
          setError(errorMsg)
          setMessages([])
        }
      }
    }

    setupMessages()

    return () => {
      isMounted = false
      console.log('🛑 [CLEANUP] Unsubscribing from messages')
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      loadedRef.current = false
    }
  }, [currentUser?.id, recipientId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageContent.trim() || !currentUser?.id || !recipientId) return

    try {
      setSending(true)
      const content = messageContent
      console.log('📤 Sending message...')

      setMessageContent('')

      await sendDirectMessage(currentUser.id, recipientId, content)

      console.log('✅ Message sent!')

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send'
      console.error('❌ Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    console.log('⏳ Still loading...')
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <p className="text-gray-400">Loading conversation...</p>
      </div>
    )
  }

  console.log('✅ RENDER COMPLETE - otherUser:', otherUser)

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-800 p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {otherUser?.username || otherUser?.email || 'User'}
            </h2>
            <p className="text-sm text-gray-400">
              {recipientPresence?.is_online ? (
                <span className="text-green-400">● Online</span>
              ) : (
                <span className="text-gray-500">● Offline</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900 flex flex-col">
        {error && (
          <div className="p-3 bg-red-900 text-red-100 rounded mb-4 shrink-0">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-400 pt-8 shrink-0">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUser?.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} shrink-0`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-purple-600 text-white'
                      : 'bg-neutral-700 text-gray-100'
                  }`}
                >
                  <p className="break-all">{message.content}</p>
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

        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {/* Message Input */}
      <div className="border-t border-neutral-800 p-4 bg-neutral-800 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            autoFocus
            className="flex-1 bg-neutral-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageContent.trim() || sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition shrink-0"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}