import React, { useState } from 'react'
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

  console.log('MessageItem render - isHovering:', isHovering, 'hasCallbacks:', { onAddReaction: !!onAddReaction, onDeleteMessage: !!onDeleteMessage })

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
  const isEdited = message.edited_at !== null && message.edited_at !== undefined
  const reactions = getReactionsForMessage(message.id)

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div 
      style={{ position: 'relative', display: 'flex', gap: '12px', padding: '12px', backgroundColor: isHovering ? '#f9fafb' : 'white' }}
      onMouseEnter={() => {
        console.log('Mouse enter')
        setIsHovering(true)
      }}
      onMouseLeave={() => {
        console.log('Mouse leave')
        setIsHovering(false)
      }}
    >
      <img
        src={userAvatar}
        alt={username}
        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
      />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{username}</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(message.created_at)}</span>
          {isEdited && <span style={{ fontSize: '12px', color: '#9ca3af' }}>(edited)</span>}
        </div>

        {isEditing ? (
          <div style={{ marginTop: '4px' }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              rows={2}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={handleEdit}
                style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{ padding: '6px 12px', backgroundColor: '#d1d5db', color: '#374151', borderRadius: '4px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: '#1f2937', marginTop: '4px' }}>{message.content}</p>
        )}

        {reactions && reactions.length > 0 && (
          <EmojiReactions
            message={message}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        )}
      </div>

      {isHovering && (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', flexShrink: 0, backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
          {onAddReaction && (
            <div style={{ display: 'flex', gap: 0 }}>
              {['thumbsup', 'heart', 'laugh', 'surprised', 'sad', 'fire'].map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => onAddReaction(message.id, ['👍', '❤️', '😂', '😮', '😢', '🔥'][idx])}
                  style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', borderRadius: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="React"
                >
                  {['👍', '❤️', '😂', '😮', '😢', '🔥'][idx]}
                </button>
              ))}
            </div>
          )}

          <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

          {onEditMessage && (
            <button
              onClick={() => setIsEditing(true)}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', borderRadius: '4px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Edit"
            >
              ✏️
            </button>
          )}
          {onDeleteMessage && (
            <button
              onClick={handleDelete}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', borderRadius: '4px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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