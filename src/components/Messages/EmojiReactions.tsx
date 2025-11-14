import React, { useState, useCallback } from 'react'
import { useMessageStore } from '@/store/messageStore'
import type { Message, MessageReaction } from '@/types'

interface EmojiReactionsProps {
  message: Message
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>
  onRemoveReaction?: (reactionId: string) => Promise<void>
}

const EMOJI_REACTIONS = ['\ud83d\udc4d', '\u2764\ufe0f', '\ud83d\ude02', '\ud83d\ude2e', '\ud83d\ude22', '\ud83d\udd25']

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  message,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const { getReactionsForMessage } = useMessageStore()
  const reactions = getReactionsForMessage(message.id)

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
        setShowPicker(false)
      }
    },
    [message.id, onAddReaction]
  )

  const handleRemoveReaction = useCallback(
    async (reaction: MessageReaction) => {
      if (onRemoveReaction) {
        await onRemoveReaction(reaction.id)
      }
    },
    [onRemoveReaction]
  )

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => (
        <button
          key={emoji}
          onClick={() => handleRemoveReaction(emojiReactions[0])}
          className="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-1"
        >
          <span>{emoji}</span>
          <span className="text-xs text-gray-600">{emojiReactions.length}</span>
        </button>
      ))}

      {onAddReaction && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
          >
            +
          </button>

          {showPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-10">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="text-xl hover:bg-gray-100 rounded p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}