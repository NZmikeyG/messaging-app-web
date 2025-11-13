'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { Message, Channel, MessageReaction } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'

interface ChatAreaProps {
  channel: Channel | null
  userId: string
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '👏', '😢', '🤔']
const EDIT_WINDOW_MINUTES = 15

export function ChatArea({ channel, userId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [messageReactions, setMessageReactions] = useState<{
    [key: string]: { [emoji: string]: number }
  }>({})
  const [userReactions, setUserReactions] = useState<{
    [key: string]: string[]
  }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    getMessages,
    sendMessage,
    subscribeToMessages,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    getReactions,
  } = useSupabase()

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const updateReactionCounts = useCallback(
    (messageId: string, reactions: MessageReaction[]) => {
      const counts: { [emoji: string]: number } = {}
      const userReact: string[] = []

      reactions.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
        if (r.user_id === userId) {
          userReact.push(r.emoji)
        }
      })

      setMessageReactions((prev) => ({
        ...prev,
        [messageId]: counts,
      }))

      setUserReactions((prev) => ({
        ...prev,
        [messageId]: userReact,
      }))
    },
    [userId]
  )

  // Load messages when channel changes
  useEffect(() => {
    if (!channel) return

    const loadMessages = async () => {
      try {
        setLoading(true)
        const data = await getMessages(channel.id)
        setMessages(data)

        // Load reactions for all messages
        for (const msg of data) {
          const reactions = await getReactions(msg.id)
          updateReactionCounts(msg.id, reactions)
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
        toast.error('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [channel, getMessages, getReactions, updateReactionCounts])

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
      await sendMessage(channel.id, newMessage, userId)
      setNewMessage('')
      toast.success('Message sent!')

      const updatedMessages = await getMessages(channel.id)
      setMessages(updatedMessages)
    } catch (err) {
      console.error('Send message error:', err)
      toast.error(
        `Failed to send message: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      )
    }
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    try {
      await editMessage(messageId, newContent)
      setEditingMessageId(null)
      setEditingContent('')
      toast.success('Message edited!')

      const updatedMessages = await getMessages(channel!.id)
      setMessages(updatedMessages)
    } catch (err) {
      console.error('Edit message error:', err)
      toast.error('Failed to edit message')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      await deleteMessage(messageId)
      toast.success('Message deleted!')

      const updatedMessages = await getMessages(channel!.id)
      setMessages(updatedMessages)
    } catch (err) {
      console.error('Delete message error:', err)
      toast.error('Failed to delete message')
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      // Check if user already has a reaction on this message
      const userExistingReaction = userReactions[messageId]?.[0]

      // If they already reacted with this emoji, remove it (toggle)
      if (userReactions[messageId]?.includes(emoji)) {
        await removeReaction(messageId, emoji, userId)
        const reactions = await getReactions(messageId)
        updateReactionCounts(messageId, reactions)
        return
      }

      // If user already has a reaction with a DIFFERENT emoji, remove the old one first
      if (userExistingReaction && userExistingReaction !== emoji) {
        await removeReaction(messageId, userExistingReaction, userId)
      }

      // Now add the new reaction
      await addReaction(messageId, emoji, userId)

      const reactions = await getReactions(messageId)
      updateReactionCounts(messageId, reactions)
    } catch (err) {
      console.error('Add reaction error:', err)
      toast.error('Failed to add reaction')
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await removeReaction(messageId, emoji, userId)

      const reactions = await getReactions(messageId)
      updateReactionCounts(messageId, reactions)
    } catch (err) {
      console.error('Remove reaction error:', err)
      toast.error('Failed to remove reaction')
    }
  }

  const isMessageEditable = (message: Message): boolean => {
    if (message.user_id !== userId) return false
    if (message.deleted) return false

    const createdTime = new Date(message.created_at).getTime()
    const now = new Date().getTime()
    const diffMinutes = (now - createdTime) / (1000 * 60)

    return diffMinutes < EDIT_WINDOW_MINUTES
  }

  const isMessageDeletable = (message: Message): boolean => {
    return message.user_id === userId && !message.deleted
  }

  const formatTimestamp = (message: Message) => {
    const utcDate = new Date(message.created_at)

    const senderTimeStr = utcDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: message.sender_timezone || 'UTC',
    })

    const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const viewerTimeStr = utcDate.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: viewerTz,
    })

    return `${senderTimeStr} (${message.sender_timezone || 'UTC'}) - Your time: ${viewerTimeStr}`
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
            <div
              key={message.id}
              className="group hover:bg-gray-50 rounded-lg p-3 transition-colors"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-gray-900">
                      {message.user?.email || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message)}
                    </span>
                    {message.edited_at && (
                      <span className="text-xs text-gray-400 italic">(edited)</span>
                    )}
                  </div>

                  {/* Message Content or Edit Box */}
                  {editingMessageId === message.id ? (
                    <div className="mt-2 flex gap-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="flex-1 p-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleEditMessage(message.id, editingContent)
                          }
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-2 bg-gray-300 text-gray-900 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-gray-700 mt-1 ${
                        message.deleted ? 'italic text-gray-400' : ''
                      }`}
                    >
                      {message.deleted ? 'Message deleted' : message.content}
                    </p>
                  )}

                  {/* Reactions Bar */}
                  {!message.deleted &&
                    (messageReactions[message.id] ||
                      userReactions[message.id]) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(messageReactions[message.id] || {}).map(
                          ([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                if (
                                  userReactions[message.id]?.includes(emoji)
                                ) {
                                  handleRemoveReaction(message.id, emoji)
                                } else {
                                  handleAddReaction(message.id, emoji)
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                userReactions[message.id]?.includes(emoji)
                                  ? 'bg-blue-200 text-blue-900'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {emoji} {count}
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>

                {/* Edit/Delete/React Buttons */}
                {!message.deleted && (
                  <div className="hidden group-hover:flex flex-col gap-1">
                    {isMessageEditable(message) && (
                      <button
                        onClick={() => {
                          setEditingMessageId(message.id)
                          setEditingContent(message.content)
                        }}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        title="Edit (within 15 minutes)"
                      >
                        ✏️ Edit
                      </button>
                    )}

                    {isMessageDeletable(message) && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    )}

                    {/* Emoji Picker */}
                    <div className="flex gap-1 flex-wrap">
                      {EMOJI_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(message.id, emoji)}
                          className={`text-lg hover:scale-125 transition-transform ${
                            userReactions[message.id]?.includes(emoji)
                              ? 'ring-2 ring-blue-400 rounded-full p-1'
                              : ''
                          }`}
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
