'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useMessageStore } from '@/store/messageStore'
import { useUserStore } from '@/store/useUserStore'
import { EmojiReactions } from './EmojiReactions'
import { COMMON_EMOJIS, EMOJI_LIST } from '@/constants/emojis'
import type { Message, MessageReaction } from '@/types'

interface MessageItemProps {
  message: Message
  reactions?: MessageReaction[]
  onEditMessage?: (messageId: string, content: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => Promise<void>
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>
  onRemoveReaction?: (reactionId: string) => Promise<void>
  onReply?: (message: Message) => void
  currentUserId?: string
  onUserClick?: (user: { id: string, username: string, avatar_url?: string | null }) => void // Updated signature
}

// --- REFACTOR START ---
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  reactions,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onReply,
  currentUserId,
  onUserClick
}) => {
  const { profile: currentUserProfile } = useUserStore()
  const { getReactionsForMessage } = useMessageStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isHovering, setIsHovering] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const isOwn = message.user_id === (currentUserId || currentUserProfile?.id)
  const displayReactions = reactions || getReactionsForMessage(message.id)

  const handleEdit = async () => {
    if (onEditMessage && editContent.trim()) {
      await onEditMessage(message.id, editContent)
      setIsEditing(false)
    }
  }

  // Resolve Avatar/Username
  let userAvatar = message.profiles?.avatar_url
  let username = message.profiles?.username
  if ((!userAvatar || !username) && isOwn) {
    userAvatar = userAvatar || currentUserProfile?.avatar_url || undefined
    username = username || currentUserProfile?.username
  }
  username = username || 'Unknown User'

  const handleUserClick = () => {
    console.log('👤 [UserClick] Clicked user:', message.user_id, username)
    if (onUserClick && message.user_id) {
      onUserClick({
        id: message.user_id,
        username: username || 'User',
        avatar_url: userAvatar
      })
    }
  }

  const isEdited = message.edited_at !== null && message.edited_at !== undefined

  // Time formatter
  const [timeString, setTimeString] = useState<string>('')
  useEffect(() => {
    if (!message.created_at) return
    let cleanTime = message.created_at.replace(' ', 'T')
    if (!cleanTime.endsWith('Z') && !cleanTime.includes('+')) cleanTime += 'Z'
    try {
      const dateObj = new Date(cleanTime)
      const now = new Date()
      const diffMs = now.getTime() - dateObj.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      if (diffHours < 24) {
        setTimeString(dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      } else {
        setTimeString(dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      }
    } catch (e) { setTimeString('') }
  }, [message.created_at])


  return (
    <div
      className="flex gap-2 group relative mb-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setShowPicker(false); }}
    >
      {/* Left Column: Avatar */}
      <div className="shrink-0 flex flex-col items-center">
        <div
          onClick={handleUserClick}
          className="w-8 h-8 rounded-full overflow-hidden mt-1 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all shadow-sm relative"
        >
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={username}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold">
              {username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name • Time */}
        <div className="flex items-center gap-2 text-xs mb-0.5">
          <span
            onClick={handleUserClick}
            className="font-bold text-gray-300 hover:underline cursor-pointer hover:text-purple-400"
          >
            {username}
          </span>
          <span className="text-gray-500 text-[10px]">{timeString}</span>
          {isEdited && <span className="text-gray-600 italic text-[10px]">(edited)</span>}
        </div>

        {/* Message Body */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent} onChange={e => setEditContent(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleEdit} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium">Save</button>
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-transparent hover:bg-gray-800 text-gray-400 text-xs rounded transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Action Row (Bottom) */}
        {!isEditing && (
          <div className="flex items-center gap-4 mt-1 opacity-100 transition-opacity relative">
            <button
              onClick={() => onReply && onReply(message)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs font-bold transition-colors"
            >
              Reply
            </button>

            {/* More Actions (Edit/Delete) - Only if Own */}
            {isOwn && (
              <>
                <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-gray-300 text-xs font-bold">Edit</button>
                <button
                  onClick={async () => {
                    if (onDeleteMessage) {
                      try {
                        await onDeleteMessage(message.id)
                      } catch (err) {
                        console.error('❌ [DELETE] Error in handler:', err)
                      }
                    } else {
                      console.error('❌ [DELETE] Handler missing!')
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 text-xs font-bold"
                >
                  Delete
                </button>
              </>
            )}

            {/* React Button (Moved to end) */}
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className={`flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-800 transition-colors ${showPicker ? 'text-gray-300 bg-gray-800' : 'text-gray-500'}`}
                title="Add Reaction"
              >
                <span className="text-lg grayscale hover:grayscale-0 transition-all">😀</span>
              </button>

              {/* FULL Emoji Picker Popover */}
              {showPicker && (
                <EmojiPickerPopover
                  onSelect={(emoji) => { onAddReaction?.(message.id, emoji); setShowPicker(false); }}
                />
              )}
            </div>
          </div>
        )}

        {/* Reactions Display */}
        {displayReactions && displayReactions.length > 0 && (
          <div className="mt-2">
            <EmojiReactions
              message={message}
              reactions={displayReactions}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const EmojiPickerPopover = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const [expanded, setExpanded] = useState(false)
  const emojisToShow = expanded ? EMOJI_LIST : COMMON_EMOJIS

  return (
    <div className={`absolute bottom-full left-0 mb-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-3 gap-2 ${expanded
      ? 'grid grid-cols-6 w-[280px] h-[200px] overflow-y-auto'
      : 'flex flex-row items-center whitespace-nowrap'
      }`}>
      {emojisToShow.map(emoji => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(emoji)
          }}
          className="p-1 hover:bg-gray-700 rounded text-xl flex items-center justify-center transition-transform hover:scale-110"
        >
          {emoji}
        </button>
      ))}
      {!expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="p-1 hover:bg-gray-700 rounded text-sm text-gray-400 font-bold flex items-center justify-center border border-gray-600 ml-1"
          title="More Emojis"
        >
          +
        </button>
      )}
    </div>
  )
}
