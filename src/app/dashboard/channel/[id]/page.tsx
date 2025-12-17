'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { MessageItem } from '@/components/Messages/MessageItem'
import { Message, MessageReaction } from '@/types'

const DEFAULT_EMOJIS = ['👍', '😄', '🔥', '💯', '🙏', '🏀']

// Helper to build tree
const buildMessageTree = (messages: Message[]): Message[] => {
  const map = new Map<string, any>()
  messages.forEach(m => map.set(m.id, { ...m, children: [] }))

  const roots: any[] = []
  map.forEach(node => {
    if (node.parent_id) {
      const parent = map.get(node.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node) // Orphan, treat as root
      }
    } else {
      roots.push(node)
    }
  })
  return roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // Sort roots by time
}

// Recursive List Component
const MessageTree = ({
  nodes,
  depth = 0,
  reactions,
  onEdit,
  onDelete,
  onReact,
  onReply,
  replyingTo,
  onSendReply,
  currentUserId
}: any) => {
  if (!nodes || nodes.length === 0) return null

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-4 border-l-2 border-gray-800 pl-4 my-2' : 'space-y-4'}`}>
      {nodes.map((node: any) => (
        <div key={node.id}>
          <MessageItem
            message={node}
            reactions={reactions.filter((r: any) => r.message_id === node.id)}
            onEditMessage={onEdit}
            onDeleteMessage={onDelete}
            onAddReaction={onReact}
            onReply={onReply}
            currentUserId={currentUserId}
          />

          {/* Reply Form */}
          {replyingTo === node.id && (
            <div className="ml-8 mt-2 mb-4">
              <ReplyInput onSubmit={(text) => onSendReply(text, node.id)} onCancel={() => onReply(null)} />
            </div>
          )}

          {/* Children */}
          {node.children && node.children.length > 0 && (
            <MessageTree
              nodes={node.children}
              depth={depth + 1}
              reactions={reactions}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onReply={onReply}
              replyingTo={replyingTo}
              onSendReply={onSendReply}
              currentUserId={currentUserId}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const ReplyInput = ({ onSubmit, onCancel }: { onSubmit: (text: string) => void, onCancel: () => void }) => {
  const [text, setText] = useState('')
  return (
    <div className="flex gap-2 items-start bg-gray-900 border border-gray-700 p-3 rounded-lg">
      <textarea
        autoFocus
        value={text} onChange={e => setText(e.target.value)}
        placeholder="What are your thoughts?"
        className="flex-1 bg-transparent text-white text-sm focus:outline-none min-h-[60px]"
      />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onSubmit(text)}
          disabled={!text.trim()}
          className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full hover:bg-purple-700 disabled:opacity-50"
        >
          Reply
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 bg-gray-800 text-gray-400 text-xs font-bold rounded-full hover:bg-gray-700">Cancel</button>
      </div>
    </div>
  )
}

export default function ChannelMessagesPage() {
  const params = useParams()
  const channelId = params.id as string
  const userProfile = useUserStore(state => state.profile)

  const [channelInfo, setChannelInfo] = useState<{ name?: string } | null>(null)

  // Data
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])

  // UI State
  const [mainInput, setMainInput] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Channel Info
  useEffect(() => {
    supabase.from('channels').select('name').eq('id', channelId).single().then((result: any) => {
      const data = result.data as { name: string } | null
      if (data) setChannelInfo(data)
    })
  }, [channelId])

  // 2. Fetch Messages & Reactions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchMessages = async () => {
    // Fetch messages with profiles
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles:user_id(id, username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as any)

      // Fetch reactions for these messages
      const msgIds = (data as any[]).map((m: any) => m.id)
      const { data: rxData } = await supabase.from('message_reactions').select('*').in('message_id', msgIds)
      if (rxData) setReactions(rxData as any)
    }
  }

  useEffect(() => {
    fetchMessages()
    // Polling or Realtime could go here
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [channelId])

  // Scroll to bottom on load (only initially or if user is at bottom? Simplistic for now)
  // useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])


  // Handlers
  const handleSend = async (text: string, parentId: string | null = null) => {
    if (!text.trim() || !userProfile?.id) return
    setSending(true)
    try {
      await supabase.from('messages').insert({
        channel_id: channelId,
        user_id: userProfile.id,
        content: text,
        parent_id: parentId
      })
      setMainInput('')
      setReplyingToId(null)
      await fetchMessages()
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const handleEdit = async (id: string, content: string) => {
    await supabase.from('messages').update({ content, edited_at: new Date().toISOString() }).eq('id', id)
    fetchMessages()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
    fetchMessages()
  }

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!userProfile?.id) return
    // Check existing
    const existing = reactions.find(r => r.message_id === msgId && r.user_id === userProfile.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({ message_id: msgId, user_id: userProfile.id, emoji })
    }
    fetchMessages()
  }

  // Derived Tree
  const messageTree = useMemo(() => buildMessageTree(messages), [messages])

  return (
    <div className="flex flex-col min-h-screen bg-black relative">
      {/* Header */}
      <div className="sticky top-0 z-10 py-3 px-6 bg-black/95 backdrop-blur-sm border-b border-gray-800 flex justify-between items-center shadow-sm">
        <span className="text-lg font-bold text-white"># {channelInfo?.name || '...'}</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ minHeight: 0 }}>
        <div className="max-w-4xl mx-auto">
          <MessageTree
            nodes={messageTree}
            reactions={reactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleToggleReaction}
            onReply={(msg: Message | null) => setReplyingToId(msg ? msg.id : null)}
            replyingTo={replyingToId}
            onSendReply={handleSend}
            currentUserId={userProfile?.id}
          />
          <div ref={bottomRef} className="h-10" />
        </div>
      </div>

      {/* Main Input (Bottom) - Only for top-level messages */}
      <div className="p-4 bg-black border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
            {userProfile?.username?.[0] || 'U'}
          </div>
          <form
            className="flex-1"
            onSubmit={e => { e.preventDefault(); handleSend(mainInput); }}
          >
            <div className="relative">
              <textarea
                value={mainInput}
                onChange={e => setMainInput(e.target.value)}
                placeholder="Start a thread..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(mainInput); } }}
              />
            </div>
            {mainInput.trim() && (
              <div className="flex justify-end mt-2">
                <button type="submit" disabled={sending} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold text-sm transition-colors">
                  Post
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
