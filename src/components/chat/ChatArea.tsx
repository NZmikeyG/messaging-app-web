'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import type { Message, Channel } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'

interface ChatAreaProps {
  channel: Channel | null
  userId: string
  userEmail: string
}

export function ChatArea({ channel, userId, userEmail }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { getMessages, sendMessage, subscribeToMessages } = useSupabase()

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load messages when channel changes
  useEffect(() => {
    if (!channel) return

    const loadMessages = async () => {
      try {
        setLoading(true)
        const data = await getMessages(channel.id)
        setMessages(data)
      } catch (error) {
        toast.error('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [channel, getMessages])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!channel) return

    const subscription = subscribeToMessages(channel.id, (newMsg) => {
      setMessages((prev) => [...prev, newMsg])
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [channel, subscribeToMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !channel) return

    try {
      console.log('Sending message:', {
        channelId: channel.id,
        userId,
        content: newMessage,
      })

      await sendMessage(channel.id, newMessage, userId)
      setNewMessage('')
      toast.success('Message sent!')

      // Reload messages immediately after sending
      const updatedMessages = await getMessages(channel.id)
      setMessages(updatedMessages)
    } catch (error) {
      console.error('Send message error:', error)
      toast.error(
        `Failed to send message: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  // Format timestamp - SIMPLE AND WORKING
  const formatTimestamp = (message: Message) => {
    const date = new Date(message.created_at)

    const timeStr = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    return `${timeStr} (${message.sender_timezone || 'UTC'})`
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a channel to start messaging</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Channel Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">#{channel.name}</h2>
        {channel.description && (
          <p className="text-sm text-gray-600">{channel.description}</p>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-gray-900">
                    {message.user?.email || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message)}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
