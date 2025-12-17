import React, { useState, useCallback } from 'react'
// import { useMessageStore } from '@/store/messageStore'
import { useUserStore } from '@/store/useUserStore'
import type { Message, MessageReaction } from '@/types'

interface EmojiReactionsProps {
  message: Message
  reactions?: MessageReaction[]
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>
  onRemoveReaction?: (reactionId: string) => Promise<void>
}

import { EMOJI_LIST, COMMON_EMOJIS } from '@/constants/emojis'

const EMOJI_REACTIONS = EMOJI_LIST

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  message,
  reactions: propReactions,
  onAddReaction,
  onRemoveReaction,
}) => {
  const { profile: currentUserProfile } = useUserStore()

  // Use props if available (realtime), otherwise use empty array (store logic removed for simplicity as page handles data)
  const reactions = propReactions || []

  // Group reactions by emoji and count them
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
      acc[reaction.emoji].push(reaction)
      return acc
    },
    {} as Record<string, MessageReaction[]>
  )

  const handleAddReaction = useCallback(
    async (emoji: string) => {
      if (onAddReaction) {
        await onAddReaction(message.id, emoji)
      }
    },
    [message.id, onAddReaction]
  )

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const hasReacted = emojiReactions.some(r => r.user_id === currentUserProfile?.id)
        return (
          <button
            key={emoji}
            onClick={() => handleAddReaction(emoji)}
            className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${hasReacted
              ? 'bg-blue-900/40 text-blue-200 border border-blue-700/50 hover:bg-blue-900/60'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
          >
            <span>{emoji}</span>
            <span className={`text-xs ${hasReacted ? 'text-blue-100' : 'opacity-70'}`}>{emojiReactions.length}</span>
          </button>
        )
      })}
    </div>
  )
}