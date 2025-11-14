import React, { useRef, useEffect } from 'react'
import { useMessageStore } from '@/store/messageStore'
import { MessageItem } from './MessageItem'
import type { Message } from '@/types'

interface MessageListProps {
  channelId: string
  messages: Message[]
  isLoading?: boolean
  onEditMessage?: (messageId: string, content: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => Promise<void>
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>
  onRemoveReaction?: (reactionId: string) => Promise<void>
}

export const MessageList: React.FC<MessageListProps> = ({
  channelId,
  messages,
  isLoading = false,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="divide-y divide-gray-200">
        {messages.map((message: Message) => (
          <MessageItem
            key={message.id}
            message={message}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}