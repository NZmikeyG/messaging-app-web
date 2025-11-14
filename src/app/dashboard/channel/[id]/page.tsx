'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useUserStore } from '@/store/useUserStore'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const INITIAL_FAVORITE_EMOJIS = ['👍', '😄', '🔥', '💯', '🙏', '🏀']
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
  profiles: Array<{
    username: string
  }>
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
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState(INITIAL_FAVORITE_EMOJIS)

  const userProfile = useUserStore(state => state.profile)
  const bottomScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchChannel() {
      const { data } = await supabase
        .from('channels')
        .select('name')
        .eq('id', channelId)
        .single()
      if (data) setChannelInfo(data as ChannelInfo)
    }
    fetchChannel()
  }, [channelId])

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, profiles(username)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Failed to fetch messages:', error.message)
      } else {
        setMessages((data as unknown as Message[]) ?? [])
      }
    }
    fetchMessages()
  }, [channelId])

  useEffect(() => {
    const fetchReactions = async () => {
      if (messages.length === 0) return
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messages.map(m => m.id))
      setReactions((data as unknown as Reaction[]) ?? [])
    }
    fetchReactions()
  }, [messages])

  useEffect(() => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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
      const { data: newData } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, profiles(username)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
      setMessages((newData as unknown as Message[]) ?? [])
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!userProfile?.id) return
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
    setRecentEmojis(prev => {
      const newList = [emoji, ...prev.filter(e => e !== emoji)]
      return newList.slice(0, 6)
    })
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messages.map(m => m.id))
    setReactions((data as unknown as Reaction[]) ?? [])
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="py-4 px-6 bg-black text-lg font-bold text-white border-b border-gray-700">
        Channel: {channelInfo?.name ? channelInfo.name : channelId}
      </div>
      <div className="flex-1 px-2 py-4 overflow-y-auto" style={{ minHeight: 0 }}>
        <ul className="space-y-2">
          {messages.map(msg => {
            // Group reactions by emoji for this message
            const reactionsByEmoji = reactions
              .filter(r => r.message_id === msg.id)
              .reduce((acc, r) => {
                if (!acc[r.emoji]) {
                  acc[r.emoji] = []
                }
                acc[r.emoji].push(r)
                return acc
              }, {} as Record<string, Reaction[]>)

            return (
              <li
                key={msg.id}
                className="bg-white px-4 py-2 rounded-lg shadow border border-gray-200 flex flex-col group relative"
                onMouseEnter={(e) => {
                  const emojiBar = e.currentTarget.querySelector('.emoji-picker')
                  if (emojiBar) (emojiBar as HTMLElement).style.display = 'flex'
                }}
                onMouseLeave={(e) => {
                  const emojiBar = e.currentTarget.querySelector('.emoji-picker')
                  if (emojiBar) (emojiBar as HTMLElement).style.display = 'none'
                }}
              >
                {/* Header row with username, time */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-800">
                      {msg.profiles?.[0]?.username || msg.user_id}:
                    </span>
                    <span className="text-xs text-gray-400">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString()
                        : ''}
                    </span>
                  </div>
                  {/* Emoji Picker Bar - Hidden by default, shown on hover */}
                  <div 
                    className="emoji-picker flex gap-1 flex-shrink-0"
                    style={{ display: 'none' }}
                  >
                    {(showAllEmojis ? ALL_EMOJIS : recentEmojis).map(emoji => {
                      const reactedByMe = reactions.some(r =>
                        r.message_id === msg.id && r.user_id === userProfile?.id && r.emoji === emoji
                      )
                      return (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleReaction(msg.id, emoji)
                          }}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm transition-all
                            ${reactedByMe 
                              ? 'bg-blue-100 border border-blue-500 font-bold' 
                              : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          type="button"
                          title={reactedByMe ? 'Remove reaction' : 'Add reaction'}
                        >
                          <span>{emoji}</span>
                        </button>
                      )
                    })}
                    {/* More button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAllEmojis(v => !v)
                      }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm bg-gray-300 hover:bg-gray-400 transition-all font-bold"
                      type="button"
                      title={showAllEmojis ? 'Show less emojis' : 'Show all emojis'}
                    >
                      {showAllEmojis ? '←' : '⋯'}
                    </button>
                  </div>
                </div>

                {/* Message content */}
                <div className="text-gray-900">{msg.content}</div>

                {/* Persistent Reactions Display (Facebook Messenger style) */}
                {Object.keys(reactionsByEmoji).length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {Object.entries(reactionsByEmoji).map(([emoji, reactors]) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleReaction(msg.id, emoji)
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-all
                          ${reactors.some(r => r.user_id === userProfile?.id)
                            ? 'bg-blue-100 border-blue-400 font-semibold'
                            : 'bg-gray-100 border-gray-300'
                          }`}
                        type="button"
                        title={`${reactors.map(r => r.user_id === userProfile?.id ? 'You' : r.user_id).join(', ')}`}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="text-xs font-semibold">{reactors.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
          <div ref={bottomScrollRef} />
        </ul>
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 p-4 bg-black">
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
        <div className="mt-2 text-red-600 font-semibold">{sendError}</div>
      )}
    </div>
  )
}
