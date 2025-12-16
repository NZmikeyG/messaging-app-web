'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { MessageItem } from '@/components/Messages/MessageItem'

const DEFAULT_EMOJIS = ['👍', '😄', '🔥', '💯', '🙏', '🏀']
const ALL_EMOJIS = [
  '👍', '😄', '🔥', '💯', '🙏', '🏀',
  '🎉', '🤔', '😭', '😂', '🥳', '👀', '👏', '🤩', '🎯', '🏆',
  '😊', '😢', '😍', '🥰', '😎', '🤯', '💥', '😇', '💀', '😬', '🤓', '😡', '🤮', '😴',
]

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
}

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

interface ChannelInfo {
  name?: string
}

export default function ChannelMessagesPage() {
  const params = useParams()
  const channelId = params.id as string

  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showRecentEmojis, setShowRecentEmojis] = useState(false)
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_EMOJIS)
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ x: number; y: number } | null>(null)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const userProfile = useUserStore(state => state.profile)
  const bottomScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchChannel() {
      try {
        const { data } = await supabase
          .from('channels')
          .select('name')
          .eq('id', channelId)
          .single()
        if (data) setChannelInfo(data as ChannelInfo)
      } catch (err) {
        console.error('Failed to fetch channel:', err)
      }
    }
    fetchChannel()
  }, [channelId])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, content, created_at, user_id')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Failed to fetch messages:', messagesError.message)
          return
        }

        const userIds = [...new Set((messagesData ?? []).map((m: any) => m.user_id))]

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds)

        const profileMap = new Map(
          (profilesData ?? []).map((p: any) => [p.id, p])
        )

        const messagesWithUsernames = (messagesData ?? []).map((msg: any) => {
          const profile = profileMap.get(msg.user_id)
          return {
            ...msg,
            username: (profile as any)?.username || msg.user_id,
            user_avatar: (profile as any)?.avatar_url
          }
        })

        setMessages(messagesWithUsernames as Message[])
      } catch (err) {
        console.error('Error fetching messages:', err)
      }
    }

    fetchMessages()
  }, [channelId])

  useEffect(() => {
    const fetchReactions = async () => {
      if (messages.length === 0) return
      try {
        const { data } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messages.map((m: any) => m.id))
          .order('created_at', { ascending: false })

        const reactionsData = (data as unknown as Reaction[]) ?? []
        setReactions(reactionsData)

        if (userProfile?.id) {
          const userReactions = reactionsData.filter(r => r.user_id === userProfile.id)
          if (userReactions.length > 0) {
            const uniqueEmojis: string[] = []
            const seen = new Set<string>()

            for (const reaction of userReactions) {
              if (!seen.has(reaction.emoji)) {
                uniqueEmojis.push(reaction.emoji)
                seen.add(reaction.emoji)
              }
            }

            const recentList = uniqueEmojis.slice(0, 6)
            if (recentList.length < 6) {
              const remaining = DEFAULT_EMOJIS.filter(e => !seen.has(e))
              recentList.push(...remaining.slice(0, 6 - recentList.length))
            }

            setRecentEmojis(recentList)
          }
        }
      } catch (err) {
        console.error('Error fetching reactions:', err)
      }
    }
    fetchReactions()
  }, [messages, userProfile?.id])

  useEffect(() => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (target.closest('[data-emoji-picker]')) {
        return
      }

      if (target.closest('button[title="Add reaction"]') || target.closest('button[title="Message options"]')) {
        return
      }

      if (activeMessageId) {
        setActiveMessageId(null)
        setEmojiPickerPos(null)
        setShowRecentEmojis(false)
        setShowAllEmojis(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMessageId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (target.closest('[data-message-menu]')) {
        return
      }

      if (target.closest('button[title="Message options"]')) {
        return
      }

      if (showMessageMenu) {
        setShowMessageMenu(null)
        setMenuPos(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMessageMenu])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSendError(null)
    setSending(true)
    try {
      if (!messageText.trim()) throw new Error('Message cannot be empty')
      if (!userProfile?.id) throw new Error('User profile not loaded')
      await supabase
        .from('messages')
        .insert([{
          channel_id: channelId,
          user_id: userProfile.id,
          content: messageText,
        }])
      setMessageText('')

      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })

      const userIds = [...new Set((messagesData ?? []).map((m: any) => m.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)

      const usernameMap = new Map(
        (profilesData ?? []).map((p: any) => [p.id, p.username])
      )

      const messagesWithUsernames = (messagesData ?? []).map((msg: any) => ({
        ...msg,
        username: usernameMap.get(msg.user_id) || msg.user_id,
      }))

      setMessages(messagesWithUsernames as Message[])
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!userProfile?.id) return
    try {
      const existing = reactions.find(
        r => r.message_id === messageId && r.user_id === userProfile.id
      )
      if (existing) {
        if (existing.emoji === emoji) {
          await supabase.from('message_reactions').delete().eq('id', existing.id)
        } else {
          await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id)
        }
      } else {
        await supabase.from('message_reactions').insert([{
          message_id: messageId,
          user_id: userProfile.id,
          emoji,
        }])
      }

      const newRecentEmojis = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 6)
      setRecentEmojis(newRecentEmojis)

      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messages.map((m: any) => m.id))
      setReactions((data as unknown as Reaction[]) ?? [])
    } catch (err) {
      console.error('Error toggling reaction:', err)
    }
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await supabase
        .from('messages')
        .update({ content, is_edited: true })
        .eq('id', messageId)

      setMessages(messages.map((m: any) =>
        m.id === messageId ? { ...m, content, is_edited: true } : m
      ))
    } catch (err) {
      console.error('Error updating message:', err)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      setMessages(messages.filter((m: any) => m.id !== messageId))
      setShowMessageMenu(null)
    } catch (err) {
      console.error('Error deleting message:', err)
    }
  }

  const handleMessageMouseEnter = (messageId: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setHoveredMessageId(messageId)
  }

  const handleMessageMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null)
    }, 100)
  }

  const handleButtonMouseEnter = (messageId: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setHoveredMessageId(messageId)
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setShowMessageMenu(messageId)
    setMenuPos({ x: rect.left - 150, y: rect.top - 120 })
  }

  const handleSmileyClick = (e: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    const rect = e.currentTarget.getBoundingClientRect()
    let xPos = rect.left - 280

    if (xPos < 10) {
      xPos = rect.right + 8
    }

    setEmojiPickerPos({ x: xPos, y: rect.top })
    setActiveMessageId(messageId)
    setShowRecentEmojis(true)
    setShowAllEmojis(false)
    setHoveredMessageId(messageId)
  }

  const handleEmojiPickerMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setActiveMessageId(null)
      setEmojiPickerPos(null)
      setShowRecentEmojis(false)
      setShowAllEmojis(false)
      setHoveredMessageId(null)
    }, 300)
  }

  const handleEmojiPickerMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }

  const isOwnMessage = (messageUserId: string) => userProfile?.id === messageUserId

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="py-4 px-6 bg-black text-lg font-bold text-white border-b border-gray-700">
        Channel: {channelInfo?.name ? channelInfo.name : channelId}
      </div>
      <div className="flex-1 px-4 py-4 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="space-y-3 flex flex-col">
          {messages.map((msg: any) => (
            <MessageItem
              key={msg.id}
              message={msg}
              reactions={reactions.filter(r => r.message_id === msg.id)}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onAddReaction={handleToggleReaction}
              onRemoveReaction={() => Promise.resolve()}
            />
          ))}
          <div ref={bottomScrollRef} />
        </div>
      </div>

      {showMessageMenu && menuPos && (
        <div
          data-message-menu="true"
          style={{
            position: 'fixed',
            top: `${menuPos.y}px`,
            left: `${menuPos.x}px`,
            zIndex: 9998,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            minWidth: '150px',
          }}
          onMouseLeave={() => setShowMessageMenu(null)}
        >
          <button
            onClick={() => {
              console.log('Edit message:', showMessageMenu)
              setShowMessageMenu(null)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-900 border-b border-gray-200 transition"
            type="button"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => handleDeleteMessage(showMessageMenu)}
            className="w-full text-left px-4 py-2 hover:bg-red-100 text-sm text-red-600 border-b border-gray-200 transition"
            type="button"
          >
            🗑️ Delete
          </button>
          <button
            onClick={() => {
              console.log('Forward message:', showMessageMenu)
              setShowMessageMenu(null)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-900 transition"
            type="button"
          >
            ↗️ Forward
          </button>
        </div>
      )}

      {activeMessageId && emojiPickerPos && showRecentEmojis && !showAllEmojis && (
        <div
          data-emoji-picker="true"
          style={{
            position: 'fixed',
            top: `${emojiPickerPos.y}px`,
            left: `${emojiPickerPos.x}px`,
            zIndex: 9999,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={handleEmojiPickerMouseEnter}
          onMouseLeave={handleEmojiPickerMouseLeave}
        >
          {recentEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleToggleReaction(activeMessageId, emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition text-lg shrink-0 cursor-pointer"
              type="button"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowAllEmojis(true)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition font-bold text-sm shrink-0 cursor-pointer"
            type="button"
          >
            ⋯
          </button>
        </div>
      )}

      {activeMessageId && emojiPickerPos && showAllEmojis && (
        <div
          data-emoji-picker="true"
          style={{
            position: 'fixed',
            top: `${emojiPickerPos.y + 50}px`,
            left: `${emojiPickerPos.x}px`,
            zIndex: 9999,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '4px',
            width: '280px',
          }}
          onMouseEnter={handleEmojiPickerMouseEnter}
          onMouseLeave={handleEmojiPickerMouseLeave}
        >
          {ALL_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                handleToggleReaction(activeMessageId, emoji)
                setShowAllEmojis(false)
              }}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded transition text-lg cursor-pointer"
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 p-4 bg-black border-t border-gray-700">
        <input
          type="text"
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          placeholder={userProfile ? 'Type your message...' : 'Profile loading...'}
          className="flex-1 px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-black text-white"
          disabled={sending || !userProfile?.id}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={sending || !messageText.trim() || !userProfile?.id}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {sendError && (
        <div className="p-4 text-red-600 font-semibold bg-red-950 border-t border-red-800">{sendError}</div>
      )}
    </div>
  )
}
