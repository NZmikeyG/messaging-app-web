'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useMessageStore } from '@/store/messageStore'
import { EmojiReactions } from './EmojiReactions'
import type { Message } from '@/types'

interface MessageItemProps {
  message: Message
  onEditMessage?: (messageId: string, content: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => Promise<void>
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>
  onRemoveReaction?: (reactionId: string) => Promise<void>
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isHovering, setIsHovering] = useState(false)
  const { getReactionsForMessage } = useMessageStore()

  const handleEdit = async () => {
    if (onEditMessage && editContent.trim()) {
      await onEditMessage(message.id, editContent)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (onDeleteMessage && window.confirm('Delete this message?')) {
      await onDeleteMessage(message.id)
    }
  }

  const userAvatar = message.profiles?.avatar_url || '/default-avatar.png'
  const username = message.profiles?.username || 'Unknown User'
  const isEdited =
    message.edited_at !== null && message.edited_at !== undefined
  const reactions = getReactionsForMessage(message.id)

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥']

  return (
    <div
      className="flex gap-3 p-3 rounded hover:bg-gray-50 transition-colors"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Image
          src={userAvatar}
          alt={username}
          width={32}
          height={32}
          className="rounded-full object-cover"
          priority={false}
        />
      </div>

      {/* Message Content */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-sm">{username}</span>
          <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
          {isEdited && <span className="text-xs text-gray-400">(edited)</span>}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-900 mt-1">{message.content}</p>
        )}

        {reactions && reactions.length > 0 && (
          <EmojiReactions
            message={message}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        )}
      </div>

      {/* Action Buttons */}
      {isHovering && (
        <div className="flex gap-1 items-start shrink-0 bg-white rounded-lg border border-gray-200 p-1 shadow-md">
          {/* Emoji Reactions */}
          {onAddReaction && (
            <div className="flex gap-0">
              {emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => onAddReaction(message.id, emoji)}
                  className="w-7 h-7 flex items-center justify-center text-base rounded hover:bg-gray-100 transition-colors"
                  title="React"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {(onAddReaction || onEditMessage || onDeleteMessage) && (
            <div className="w-px bg-gray-300 mx-1" />
          )}

          {/* Edit Button */}
          {onEditMessage && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-7 h-7 flex items-center justify-center text-base rounded hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              ✏️
            </button>
          )}

          {/* Delete Button */}
          {onDeleteMessage && (
            <button
              onClick={handleDelete}
              className="w-7 h-7 flex items-center justify-center text-base rounded hover:bg-red-100 transition-colors"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
