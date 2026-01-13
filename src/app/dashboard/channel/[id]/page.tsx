'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { MessageItem } from '@/components/Messages/MessageItem'
import { UserDMPopover } from '@/components/UserDMPopover'
import { Message, MessageReaction } from '@/types'
import { MentionPopup } from '@/components/Messages/MentionPopup'

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
  currentUserId,
  onUserClick, // New
  channelMembers
}: any) => {
  if (!nodes || nodes.length === 0) return null

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-4 border-l-2 theme-border pl-4 my-2' : 'space-y-4'}`}>
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
            onUserClick={onUserClick}
            channelMembers={channelMembers}
          />

          {/* Reply Form */}
          {replyingTo === node.id && (
            <div className="ml-8 mt-2 mb-4">
              <ReplyInput
                onSubmit={(text) => onSendReply(text, node.id)}
                onCancel={() => onReply(null)}
                users={channelMembers} // Use the fetched members (now all profiles)
              />
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
              onUserClick={onUserClick}
              channelMembers={channelMembers}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const ReplyInput = ({ onSubmit, onCancel, users }: { onSubmit: (text: string) => void, onCancel: () => void, users: any[] }) => {
  const [text, setText] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [query, setQuery] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    const match = val.match(/@([a-zA-Z0-9_ ]*)$/)
    if (match) {
      setQuery(match[1])
      setShowPopup(true)
    } else {
      setShowPopup(false)
    }
  }

  const handleSelect = (user: any) => {
    const lastIndex = text.lastIndexOf(`@${query}`)
    if (lastIndex !== -1) {
      const prefix = text.substring(0, lastIndex)
      const suffix = text.substring(lastIndex + (`@${query}`).length)
      setText(`${prefix}@${user.username} ${suffix}`)
    }
    setShowPopup(false)
  }

  const filtered = users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex gap-2 items-start theme-bg-input border theme-border-secondary p-3 rounded-lg relative">
      {showPopup && filtered.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 z-50">
          <MentionPopup
            users={filtered}
            onSelect={handleSelect}
            onClose={() => setShowPopup(false)}
            position={{ top: 0, left: 0 }}
          />
        </div>
      )}
      <textarea
        autoFocus
        value={text} onChange={handleChange}
        placeholder="Reply..."
        className="flex-1 bg-transparent theme-text-primary text-sm focus:outline-none min-h-[60px]"
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
  const fetchMessages = React.useCallback(async () => {
    // Fetch messages with profiles
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles:user_id(id, username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as any)

      // Fetch reactions for these messages
      if (data.length > 0) {
        const msgIds = (data as any[]).map((m: any) => m.id)
        const { data: rxData } = await supabase.from('message_reactions').select('*').in('message_id', msgIds)
        if (rxData) setReactions(rxData as any)
      } else {
        setReactions([])
      }
    }
  }, [channelId])

  useEffect(() => {
    fetchMessages()

    // 1. Realtime Subscription (Instant Updates)
    const channel = supabase
      .channel(`channel_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        () => {
          fetchMessages()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload: any) => {
          fetchMessages()
        }
      )
      .subscribe()

    // 2. Safety Poll (Backup every 20s in case of connection drop)
    const interval = setInterval(fetchMessages, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [channelId, fetchMessages])

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
    console.log('📝 [EDIT] Attempting to edit message:', id)
    const { data, error, count } = await supabase.from('messages').update({
      content,
      edited_at: new Date().toISOString(),
      is_edited: true
    })
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ [EDIT ERROR]', error)
      alert(`Failed to edit message: ${error.message}`)
    } else if (!data || data.length === 0) {
      console.warn('⚠️ [EDIT] No rows updated! Check RLS policies or ownership.', { id, user: userProfile?.id })
      alert('Failed to edit: You might not have permission or the message was not found.')
    } else {
      console.log('✅ [EDIT] Success:', data)
      fetchMessages()
    }
  }

  const handleDelete = async (id: string) => {
    // Confirm is handled in MessageItem
    console.log('🗑️ [DELETE] Attempting to delete message:', id)

    // Attempt soft delete
    const { data, error, count } = await supabase
      .from('messages')
      .update({
        content: '[deleted]',
        deleted: true,
        is_deleted: true
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ [DELETE ERROR]', error)
      alert(`Failed to delete message: ${error.message}`)
    } else if (!data || data.length === 0) {
      console.warn('⚠️ [DELETE] No rows updated! Check RLS policies or ownership.', { id, user: userProfile?.id })
      alert('Failed to delete: You might not have permission or the message was not found.')
    } else {
      console.log('✅ [DELETE] Success:', data)
      fetchMessages()
    }
  }

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!userProfile?.id) return

    // Find if user already has ANY reaction on this message
    const existingReaction = reactions.find(r => r.message_id === msgId && r.user_id === userProfile.id)

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Toggle OFF if clicking same emoji
        await supabase.from('message_reactions').delete().eq('id', existingReaction.id)
      } else {
        // REPLACE if clicking different emoji
        // Delete old one first (or update, but delete+insert is cleaner for composite keys if unique constraint acts up)
        await supabase.from('message_reactions').delete().eq('id', existingReaction.id)
        await supabase.from('message_reactions').insert({ message_id: msgId, user_id: userProfile.id, emoji })
      }
    } else {
      // Add new
      await supabase.from('message_reactions').insert({ message_id: msgId, user_id: userProfile.id, emoji })
    }
    fetchMessages()
  }

  // DM Popover State
  const [dmTargetUser, setDmTargetUser] = useState<{ id: string, username: string, avatar_url?: string | null } | null>(null)

  const handleUserClick = (user: { id: string, username: string, avatar_url?: string | null }) => {
    console.log('👀 [PAGE] User Clicked:', user)
    // Open DM Popover
    if (user.id !== userProfile?.id) {
      setDmTargetUser(user)
    }
  }

  // Derived Tree
  const messageTree = useMemo(() => buildMessageTree(messages), [messages])

  // Mention Logic
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [channelMembers, setChannelMembers] = useState<any[]>([])
  const [showMentionPopup, setShowMentionPopup] = useState(false)

  // Fetch CHANNEL MEMBERS for mentions (reverted to only channel members)
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('channel_members')
        .select('profiles(id, username, avatar_url)')
        .eq('channel_id', channelId)

      if (data) {
        // Flatten the structure: [{ profiles: { ... } }] -> [{ ... }]
        const members = data.map((item: any) => item.profiles).filter(Boolean)
        setChannelMembers(members)
      }
    }
    fetchMembers()
  }, [channelId])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value
    setMainInput(newVal)

    // Simple detection: Last word starts with @ (allow spaces for names like "Campbell Marsters")
    const match = newVal.match(/@([a-zA-Z0-9_ ]*)$/)
    if (match) {
      setMentionQuery(match[1])
      setShowMentionPopup(true)
    } else {
      setShowMentionPopup(false)
      setMentionQuery(null)
    }
  }

  const handleMentionSelect = (user: { username: string }) => {
    if (!mentionQuery && mentionQuery !== '') return

    // Replace the last occurrence of @query with @username + space
    // Logic: Find the last index of @ + query
    const lastIndex = mainInput.lastIndexOf(`@${mentionQuery}`)
    if (lastIndex !== -1) {
      const prefix = mainInput.substring(0, lastIndex)
      const suffix = mainInput.substring(lastIndex + (`@${mentionQuery}`).length)
      const newValue = `${prefix}@${user.username} ${suffix}`
      setMainInput(newValue)
    }
    setShowMentionPopup(false)
    // Focus back handled by browser usually since button click doesn't blur permanently on some logic but we might need ref.focus()
  }

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return []
    return channelMembers.filter(m => m.username?.toLowerCase().includes(mentionQuery.toLowerCase()))
  }, [channelMembers, mentionQuery])

  return (
    <div className="flex flex-col min-h-screen theme-bg-primary relative">
      {/* Mention Popup */}
      {showMentionPopup && filteredMembers.length > 0 && (
        <div className="absolute bottom-24 left-4 z-50">
          <MentionPopup
            users={filteredMembers}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentionPopup(false)}
            position={{ top: 0, left: 0 }} // Managed by CSS parent absolute
          />
        </div>
      )}

      {/* DM Popover */}
      <UserDMPopover
        isOpen={!!dmTargetUser}
        onClose={() => setDmTargetUser(null)}
        targetUser={dmTargetUser}
      />
      {/* Header */}
      <div className="sticky top-0 z-10 py-3 px-6 theme-bg-primary border-b theme-border flex justify-between items-center shadow-sm">
        <span className="text-lg font-bold theme-text-primary"># {channelInfo?.name || '...'}</span>
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
            onUserClick={handleUserClick}
            channelMembers={channelMembers} // Pass down to tree
          />
          <div ref={bottomRef} className="h-10" />
        </div>
      </div>

      {/* Main Input (Bottom) - Only for top-level messages */}
      <div className="p-4 theme-bg-primary border-t theme-border relative z-20">
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
                onChange={handleInputChange}
                placeholder="Start a thread... (Type @ to mention)"
                className="w-full theme-bg-input border theme-border-secondary rounded-lg p-3 theme-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none"
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
