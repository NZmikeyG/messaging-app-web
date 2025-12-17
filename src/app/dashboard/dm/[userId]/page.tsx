'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import {
  getMessages,
  sendDirectMessage,
  subscribeToMessages,
  updateDirectMessage,
  deleteDirectMessage,
  addReaction,
  type DirectMessage,
} from '@/lib/supabase/directMessages'
import { getUserById } from '@/lib/supabase/users'
import { useUserPresence } from '@/hooks/usePresence'
import { ForwardMessageModal } from '@/components/Sidebar/ForwardMessageModal'

import type { Profile } from '@/types'

import { EMOJI_LIST, COMMON_EMOJIS } from '@/constants/emojis'

export default function DMConversation() {
  const params = useParams()
  const { profile: currentUser } = useUserStore()
  const recipientId = params.userId as string

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)

  // UI States
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Forwarding
  const [isForwardOpen, setIsForwardOpen] = useState(false)
  const [forwardContent, setForwardContent] = useState('')
  const [showAllEmojis, setShowAllEmojis] = useState(false)

  const { presence: recipientPresence } = useUserPresence(recipientId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch recipient user info
  useEffect(() => {
    if (!recipientId) return
    let isMounted = true
    const fetchOtherUser = async () => {
      const user = await getUserById(recipientId)
      if (isMounted && user) setOtherUser(user)
      else if (isMounted) setOtherUser({ id: recipientId, email: 'unknown', username: 'User' })
    }
    fetchOtherUser()
    return () => { isMounted = false }
  }, [recipientId])

  // Load messages
  useEffect(() => {
    if (!currentUser?.id || !recipientId) return
    let isMounted = true

    const setupMessages = async () => {
      setLoading(true)
      const data = await getMessages(currentUser.id, recipientId)
      if (isMounted) {
        setMessages(data ?? [])
        setLoading(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
      }

      subscribeToMessages(currentUser.id, recipientId, (newMessage) => {
        if (!isMounted) return
        setMessages((prev) => {
          // If update (reaction/edit), replace
          const idx = prev.findIndex(m => m.id === newMessage.id)
          if (idx !== -1) {
            const newArr = [...prev]
            newArr[idx] = newMessage
            return newArr
          }
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
          return [...prev, newMessage]
        })
      })
    }
    setupMessages()
    return () => { isMounted = false }
  }, [currentUser?.id, recipientId])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-message-menu]')) return
      setShowMessageMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() || !currentUser?.id) return
    try {
      setSending(true)
      const content = messageContent.trim()
      setMessageContent('')
      const newMessage = await sendDirectMessage(currentUser.id, recipientId, content)
      setMessages(prev => [...prev, newMessage])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error(err)
      setMessageContent(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    // Removed confirm for consistency with main chat
    try {
      await deleteDirectMessage(messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      setShowMessageMenu(null)
    } catch (err) {
      console.error('Failed to delete DM:', err)
      alert('Failed to delete')
    }
  }

  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMessageId || !editContent.trim()) return
    try {
      await updateDirectMessage(editingMessageId, editContent.trim())
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: editContent.trim(), updated_at: new Date().toISOString() } : m))
      setEditingMessageId(null)
    } catch (err) {
      alert('Failed to update')
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const current = m.reactions?.[emoji] || []
      const hasReacted = current.includes(currentUser.id)
      const newReactions = { ...(m.reactions || {}) }
      if (hasReacted) {
        newReactions[emoji] = current.filter(id => id !== currentUser.id)
        if (newReactions[emoji].length === 0) delete newReactions[emoji]
      } else {
        newReactions[emoji] = [...current, currentUser.id]
      }
      return { ...m, reactions: newReactions }
    }))

    try {
      const msg = messages.find(m => m.id === messageId)
      await addReaction(messageId, emoji, currentUser.id, msg?.reactions)
    } catch (e) {
      console.error('Reaction failed', e)
    }
    setShowMessageMenu(null)
  }

  const openForwardModal = (content: string) => {
    setForwardContent(content)
    setIsForwardOpen(true)
    setShowMessageMenu(null)
  }

  if (loading && !otherUser) return <div className="p-8 text-white">Loading...</div>

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-800 p-4 shrink-0 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">{otherUser?.username || 'User'}</h2>
          <div className={`text-xs ${recipientPresence?.is_online ? 'text-green-400' : 'text-gray-400'}`}>
            {recipientPresence?.is_online ? '● Online' : '● Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUser?.id
          const isEditing = editingMessageId === msg.id

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative items-end`}
              onMouseEnter={() => {
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
                setHoveredMessageId(msg.id)
              }}
              onMouseLeave={() => {
                hideTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), 100)
              }}
            >
              {!isOwn && (
                <div className="relative w-8 h-8 shrink-0 mr-2 mb-1">
                  <Image
                    src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.username || 'User'}&background=random`}
                    alt={otherUser?.username || 'User'}
                    className="rounded-full object-cover"
                    fill
                    sizes="32px"
                  />
                </div>
              )}

              <div className="max-w-[70%]">
                {isEditing ? (
                  <form onSubmit={handleEditMessage} className="bg-neutral-800 p-2 rounded">
                    <input
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="bg-neutral-700 w-full p-1 rounded text-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setEditingMessageId(null)} className="text-xs text-gray-400">Cancel</button>
                      <button type="submit" className="text-xs text-purple-400">Save</button>
                    </div>
                  </form>
                ) : (
                  <div className={`
                        px-4 py-2 rounded-2xl relative
                        ${isOwn ? 'bg-purple-600 rounded-br-none' : 'bg-neutral-800 rounded-bl-none'}
                      `}>
                    <p className="whitespace-pre-wrap word-break">{msg.content}</p>
                    <div className="text-[10px] opacity-70 flex justify-end gap-1 mt-1">
                      {(() => {
                        let cleanTime = msg.created_at.replace(' ', 'T')
                        if (!cleanTime.endsWith('Z') && !cleanTime.includes('+')) {
                          cleanTime += 'Z'
                        }
                        return new Date(cleanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      })()}
                      {msg.updated_at && msg.updated_at !== msg.created_at && <span>(edited)</span>}
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 border
                              ${users.includes(currentUser?.id || '') ? 'bg-purple-500/20 border-purple-500/50' : 'bg-neutral-700/50 border-transparent'}
                            `}
                          >
                            <span>{emoji}</span>
                            <span className="opacity-70">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isOwn && (
                <div className="relative w-8 h-8 shrink-0 ml-2 mb-1">
                  <Image
                    src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.username || 'User'}&background=random`}
                    alt={currentUser?.username || 'User'}
                    className="rounded-full object-cover"
                    fill
                    sizes="32px"
                  />
                </div>
              )}

              {/* Action Button - Adjusted Positioning */}
              {hoveredMessageId === msg.id && !isEditing && (
                <div className={`flex items-center mx-2 ${isOwn ? 'order-first' : 'order-last'}`}>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setShowMessageMenu(msg.id)
                      setMenuPos({ x: rect.left, y: rect.top })
                      setShowAllEmojis(false)
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full border border-gray-700 text-gray-400 hover:text-white shadow-lg"
                  >
                    ⋯
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-neutral-800 border-t border-neutral-700 flex gap-2">
        <input
          value={messageContent}
          onChange={e => setMessageContent(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
          placeholder="Type a message..."
        />
        <button type="submit" disabled={!messageContent.trim() || sending} className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-700 disabled:opacity-50">
          Send
        </button>
      </form>

      {/* Context Menu */}
      {showMessageMenu && menuPos && (
        <div
          data-message-menu
          className="fixed z-50 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
          style={{
            // Vertical positioning: if close to bottom, show above
            top: menuPos.y > (typeof window !== 'undefined' ? window.innerHeight - 300 : 0) ? undefined : menuPos.y,
            bottom: menuPos.y > (typeof window !== 'undefined' ? window.innerHeight - 300 : 0) ? (typeof window !== 'undefined' ? window.innerHeight - menuPos.y : 0) : undefined,

            // Horizontal positioning
            left: menuPos.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 0) ? undefined : menuPos.x,
            right: menuPos.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 0) ? (typeof window !== 'undefined' ? window.innerWidth - menuPos.x - 32 : 0) : undefined
          }}
        >
          {/* Quick Reactions */}
          <div className="p-2 border-b border-neutral-700">
            {!showAllEmojis ? (
              <div className="flex gap-1 justify-between items-center">
                {COMMON_EMOJIS.slice(0, 5).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(showMessageMenu, emoji)}
                    className="hover:bg-neutral-700 p-1 rounded text-lg w-8 h-8 flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAllEmojis(true); }}
                  className="hover:bg-neutral-700 p-1 rounded text-gray-400 w-8 h-8 flex items-center justify-center text-xs bg-neutral-900 border border-neutral-700"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1 mb-2">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(showMessageMenu, emoji)}
                    className="hover:bg-neutral-700 p-1 rounded text-lg flex justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col py-1">
            <button onClick={() => openForwardModal(messages.find(m => m.id === showMessageMenu)?.content || '')} className="px-4 py-2 text-left hover:bg-neutral-700 text-sm">
              ↗️ Forward
            </button>
            {messages.find(m => m.id === showMessageMenu)?.sender_id === currentUser?.id && (
              <>
                <button onClick={() => {
                  const msg = messages.find(m => m.id === showMessageMenu)
                  if (msg) {
                    setEditingMessageId(msg.id)
                    setEditContent(msg.content)
                    setShowMessageMenu(null)
                  }
                }} className="px-4 py-2 text-left hover:bg-neutral-700 text-sm">
                  ✏️ Edit
                </button>
                <button onClick={() => handleDeleteMessage(showMessageMenu)} className="px-4 py-2 text-left hover:bg-red-900/50 text-red-500 text-sm">
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ForwardMessageModal
        isOpen={isForwardOpen}
        onClose={() => setIsForwardOpen(false)}
        content={forwardContent}
      />
    </div>
  )
}
