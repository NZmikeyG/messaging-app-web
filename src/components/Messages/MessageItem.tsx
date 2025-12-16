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
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  reactions,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}) => {
  const { profile: currentUserProfile } = useUserStore()
  const { getReactionsForMessage } = useMessageStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isHovering, setIsHovering] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  // Determine ownership
  const isOwn = message.user_id === currentUserProfile?.id

  // Use local or prop reactions
  const displayReactions = reactions || getReactionsForMessage(message.id)

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

  // Access current user for fallback avatar
  // const { profile: currentUserProfile } = useUserStore() // Already destructured at top? No, it was inside body.

  // Resolve Avatar: Use message profile, or fallback to current user if it matches, or default
  let userAvatar = message.profiles?.avatar_url
  let username = message.profiles?.username

  // If missing profile (e.g. real-time message) and it's me, use my store profile
  if ((!userAvatar || !username) && isOwn) {
    userAvatar = userAvatar || currentUserProfile?.avatar_url || undefined
    username = username || currentUserProfile?.username
  }

  username = username || 'Unknown User'

  const isEdited =
    message.edited_at !== null && message.edited_at !== undefined

  const [timeString, setTimeString] = useState<string>('')

  useEffect(() => {
    if (!message.created_at) return
    let cleanTime = message.created_at.replace(' ', 'T')
    if (!cleanTime.endsWith('Z') && !cleanTime.includes('+')) cleanTime += 'Z'
    const dateObj = new Date(cleanTime)
    setTimeString(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [message.created_at])

  const displayTime = timeString
  const emojis = COMMON_EMOJIS

  return (
    <div
      className={`group flex gap-3 p-3 hover:bg-white/5 transition-colors ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setShowPicker(false)
      }}
    >
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 relative" title={username}>
        {userAvatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={userAvatar}
            alt={username}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="font-bold text-sm text-gray-300">{username}</span>
          <span className="text-xs text-gray-500">{displayTime}</span>
        </div>

        {isEditing ? (
          <div className="w-full">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900"
              rows={2}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">Cancel</button>
              <button onClick={handleEdit} className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">Save</button>
            </div>
          </div>
        ) : (
          <div className={`px-4 py-2 rounded-2xl relative group-message ${isOwn
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-300 text-black rounded-bl-none'
            }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {isEdited && <span className="text-[10px] opacity-70 block text-right mt-1">(edited)</span>}
          </div>
        )}

        {displayReactions && displayReactions.length > 0 && (
          <EmojiReactions
            message={message}
            reactions={displayReactions}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        )}
      </div>

      {/* Action Buttons (Hover Menu) */}
      {isHovering && !isEditing && (
        <div className={`flex items-center self-start -mt-2 ${isOwn ? 'mr-2' : 'ml-2'}`}>
          <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm p-1 gap-1">
            {/* Quick Emojis */}
            {onAddReaction && emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction(message.id, emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
              >
                {emoji}
              </button>
            ))}

            {/* More Emojis Button */}
            {onAddReaction && (
              <div className="relative">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"
                  title="Add Reaction"
                >
                  +
                </button>
                {showPicker && (
                  <div className={`absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 grid grid-cols-6 gap-1 w-64 ${isOwn ? 'right-0' : 'left-0'}`}>
                    {/* We need the full emoji list here. Importing EMOJI_LIST */}
                    {/* EMOJI_LIST is not imported yet, I need to check import. It wraps EMOJI_LIST usage. */}
                    {/* Assuming I can access EMOJI_LIST from what is available or import it. */}
                    {/* Wait, I need to make sure I imported EMOJI_LIST. Step 1084 imported it? No, 1110 shows line 8: import { COMMON_EMOJIS } from... */}
                    {/* I need to update imports first if I want to use EMOJI_LIST. for now I will use COMMON_EMOJIS repeated or just import it in a separate step? */}
                    {/* Actually I'll rely on the existing imports in the file. Line 8 says import { COMMON_EMOJIS }... if I want EMOJI_LIST I need to change import. */}
                    {/* I'll start with just mapping existing emojis or I'll just skip the full picker implementation here and rely on the fact that the user can use the "Smile" button. */}
                    {/* Wait, the user specifically asked for "Additional emoji" button. */}
                    {/* Logic: I'll stick to a simple button that toggles `showPicker`. But I need `EMOJI_LIST`. */}
                    {/* I will assume I can update the import in this same step if I match the top of the file? No, I am replacing the BODY (lines 20-211). */}
                    {/* I will use a placeholder or best effort, and then do a second pass to fix import if needed. */}
                    {/* Actually, looking at file content (Step 1110), line 8 is: import { COMMON_EMOJIS, EMOJI_LIST } from '@/constants/emojis'. */}
                    {/* I will mistakenly reference EMOJI_LIST if I try. */}
                    {/* I'll use COMMON_EMOJIS for now but I really should show more. I'll add "..." button. */}
                    {/* Better: I will use the `EmojiReactions` component's `+` button? No, that's for existing reactions. */}
                    {/* I'll implement the picker using `COMMON_EMOJIS` for now, and then immediately update the import in next step. */}
                    {(typeof EMOJI_LIST !== 'undefined' ? EMOJI_LIST : COMMON_EMOJIS).map((emoji: string) => ( // Safe fallback
                      <button key={emoji} onClick={() => { onAddReaction(message.id, emoji); setShowPicker(false); }} className="p-1 hover:bg-gray-100 rounded text-xl">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="w-px bg-gray-300 mx-1" />

            {onEditMessage && isOwn && (
              <button onClick={() => setIsEditing(true)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500">✏️</button>
            )}
            {onDeleteMessage && isOwn && (
              <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center hover:bg-red-100 rounded text-red-500">🗑️</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
