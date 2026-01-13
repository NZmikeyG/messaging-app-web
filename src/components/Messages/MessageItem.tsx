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
  onUserClick?: (user: { id: string, username: string, avatar_url?: string | null }) => void
  channelMembers?: { id: string, username: string, avatar_url?: string | null }[]
}

// Keep helper simple if needed outside, but we move logic inside for closure access or pass args
// Actually, let's move formatContent inside or pass args.
const formatContent = (content: string, channelMembers: MessageItemProps['channelMembers'], onUserClick: MessageItemProps['onUserClick']) => {
  if (!content) return null

  // Split by mention pattern: @name (allowing spaces)
  // We match one or more words following @.
  // We use a capture group to split, but we need to be careful not to match too aggressively.
  // Best approach: Match longest possible known username?
  // Current approach: Split by @(words+spaces), then check.
  // Regex: /(@[a-zA-Z0-9_]+(?: [a-zA-Z0-9_]+)*)/g matches @Word or @Word Word
  const parts = content.split(/(@[a-zA-Z0-9_]+(?: [a-zA-Z0-9_]+)*)/g)

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const potentialUsername = part.slice(1)
      // Look up user (case insensitive matching)
      // We explicitly check if 'potentialUsername' matches a known member.
      const user = channelMembers?.find(m => m.username?.toLowerCase() === potentialUsername.toLowerCase())

      if (user) {
        return (
          <span
            key={i}
            className="text-blue-400 font-medium cursor-pointer hover:underline bg-blue-500/10 px-0.5 rounded"
            onClick={(e) => {
              e.stopPropagation()
              onUserClick?.(user)
            }}
          >
            {part}
          </span>
        )
      }
      // If not a user, return plain text (or just blue text if we want to fallback, but plain is safer for "blue text" bug)
      return <span key={i} className="text-blue-400/70">{part}</span>
    }
    return part
  })
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  reactions,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onReply,
  currentUserId,
  onUserClick,
  channelMembers
}) => {
  const { profile: currentUserProfile } = useUserStore()
  const { getReactionsForMessage } = useMessageStore()

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isHovering, setIsHovering] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const isOwn = message.user_id === (currentUserId || currentUserProfile?.id)
  const displayReactions = reactions || getReactionsForMessage(message.id)

  const handleSaveEdit = async () => {
    if (onEditMessage && editContent.trim() && editContent !== message.content) {
      await onEditMessage(message.id, editContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(message.content)
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
      <div className={`flex items-start gap-4 group ${(message.deleted || (message as any).is_deleted) ? 'opacity-50' : ''} w-full`}>
        {/* Avatar */}
        <div className="flex-shrink-0 cursor-pointer" onClick={() => !(message.deleted || (message as any).is_deleted) && handleUserClick()}>
          {userAvatar ? (
            <div className="relative w-10 h-10">
              <Image
                src={userAvatar}
                alt={username || 'User'}
                fill
                className="rounded-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              {(username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-bold theme-text-primary ${!(message.deleted || (message as any).is_deleted) && 'cursor-pointer hover:underline'}`}
              onClick={() => !(message.deleted || (message as any).is_deleted) && handleUserClick()}
            >
              {username}
            </span>
            <span className="text-xs theme-text-muted">
              {timeString}
            </span>
            {(isEdited || (message as any).is_edited) && !(message.deleted || (message as any).is_deleted) && (
              <span className="text-xs text-gray-500">(edited)</span>
            )}
          </div>

          <div className="mt-1 theme-text-secondary whitespace-pre-wrap break-words">
            {isEditing ? (
              <span className="italic text-gray-500">[deleted]</span>
            ) : (
              formatContent(message.content, channelMembers, onUserClick)
            )}
          </div>

          {/* Reactions */}
          {!(message.deleted || (message as any).is_deleted) && !isEditing && displayReactions && displayReactions.length > 0 && (
            <div className="mt-2">
              <EmojiReactions
                message={message}
                reactions={displayReactions}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            </div>
          )}

          {/* Action Bar */}
          {!(message.deleted || (message as any).is_deleted) && (
            <div className="mt-2 flex items-center gap-4 relative">

              {/* Add Reaction Button */}
              <div className="relative">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className={`flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-800/50 transition-colors ${showPicker ? 'theme-text-secondary bg-gray-800/50' : 'theme-text-muted'}`}
                  title="Add Reaction"
                >
                  <span className="text-lg grayscale hover:grayscale-0 transition-all">😀</span>
                </button>

                {showPicker && (
                  <EmojiPickerPopover
                    onSelect={(emoji) => { onAddReaction?.(message.id, emoji); setShowPicker(false); }}
                  />
                )}
              </div>

              {/* Reply Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReply && onReply(message);
                }}
                className="theme-text-muted hover:theme-text-primary flex items-center gap-1 text-xs"
              >
                Reply
              </button>

              {/* Edit/Delete (Owner) */}
              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔘 [MessageItem] Edit Clicked', message.id);
                      handleEdit();
                    }}
                    className="theme-text-muted hover:theme-text-primary flex items-center gap-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔘 [MessageItem] Delete Clicked', message.id);
                      if (!onDeleteMessage) return;

                      // Check if already in delete confirmation mode
                      if (isDeleting) {
                        onDeleteMessage(message.id);
                        setIsDeleting(false);
                      } else {
                        setIsDeleting(true);
                        // Auto-reset after 3 seconds if not confirmed
                        setTimeout(() => setIsDeleting(false), 3000);
                      }
                    }}
                    className={`flex items-center gap-1 text-xs transition-colors ${isDeleting ? 'text-red-500 font-bold hover:text-red-600' : 'theme-text-muted hover:text-red-400'}`}
                  >
                    {isDeleting ? 'Confirm?' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const EmojiPickerPopover = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const [expanded, setExpanded] = useState(false)
  const emojisToShow = expanded ? EMOJI_LIST : COMMON_EMOJIS

  return (
    <div className={`absolute bottom-full left-0 mb-2 z-50 theme-bg-card border theme-border rounded-xl shadow-xl p-3 gap-2 ${expanded
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
