'use client'

import { supabase } from './client'

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  updated_at?: string
  is_read: boolean
  reactions?: Record<string, string[]> // { "emoji": ["userId1", "userId2"] }
}

export interface Conversation {
  id: string
  user_1_id: string
  user_2_id: string
  last_message_id: string | null
  last_message_at: string
  last_message_content?: string
  other_user?: {
    id: string
    email: string
    username?: string
    avatar_url: string | null
    status: string
  }
}

// Fetch all conversations for a user
export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    console.log('📥 [CONVERSATIONS] Fetching for user:', userId)

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error fetching messages:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No conversations found')
      return []
    }

    // Group conversations and get latest message from each user
    const conversationMap = new Map<string, Conversation>()

    data.forEach((msg: any) => {
      const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id

      // Skip if we already have a conversation with this user
      if (conversationMap.has(otherUserId)) return

      conversationMap.set(otherUserId, {
        id: msg.id,
        user_1_id: userId,
        user_2_id: otherUserId,
        last_message_id: msg.id,
        last_message_at: msg.created_at,
        last_message_content: msg.content,
        other_user: undefined,
      })
    })

    // Fetch user info for each conversation
    const userIds = Array.from(conversationMap.keys())
    if (userIds.length === 0) return []

    console.log('🔵 Fetching user data for conversations:', userIds.length)

    // Fetch user info from 'profiles' (source of truth for name/avatar)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    }

    // Fetch user presence (source of truth for status)
    const { data: presenceData, error: presenceError } = await supabase
      .from('user_presence')
      .select('user_id, status, is_online')
      .in('user_id', userIds)

    if (presenceError) {
      console.warn('⚠️ Error fetching presence:', presenceError)
    }

    // Fallback: Fetch from 'users' table if profiles missing (legacy/backup)
    let usersData: any[] = []
    if (!profilesData || profilesData.length < userIds.length) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, avatar_url')
        .in('id', userIds)
      if (data) usersData = data
    }

    // Map user data to conversations
    const conversations = Array.from(conversationMap.values()).map((conv) => {
      // 1. Try profile first
      let userData: any = profilesData?.find((u: any) => u.id === conv.user_2_id)

      // 2. Fallback to users table
      if (!userData) {
        userData = usersData?.find((u: any) => u.id === conv.user_2_id)
      }

      // 3. Get presence
      const presence = presenceData?.find((p: any) => p.user_id === conv.user_2_id)

      if (userData) {
        conv.other_user = {
          id: userData.id,
          email: userData.email || 'Unknown',
          username: userData.username || userData.email?.split('@')[0] || 'User',
          avatar_url: userData.avatar_url || null,
          status: presence?.status || 'offline', // Use real presence status
        }
      } else {
        // Absolute fallback if everything fails
        conv.other_user = {
          id: conv.user_2_id,
          email: 'Unknown',
          username: 'User',
          avatar_url: null,
          status: 'offline'
        }
      }

      return conv
    })

    console.log('✅ Conversations fetched:', conversations.length)
    return conversations
  } catch (error) {
    console.error('❌ Error in getConversations:', error)
    return []
  }
}

// Fetch messages between two users
export const getMessages = async (
  userId: string,
  otherUserId: string,
  limit = 50
): Promise<DirectMessage[] | null> => {
  try {
    console.log('📥 [MESSAGES] Fetching between:', userId, otherUserId)

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('❌ [MESSAGES] Error:', error)
      throw error
    }

    console.log('✅ [MESSAGES] Got', data?.length ?? 0, 'messages')
    return data || []
  } catch (error) {
    console.error('❌ Exception in getMessages:', error)
    throw error
  }
}

// Send a direct message
export const sendDirectMessage = async (
  senderId: string,
  recipientId: string,
  content: string
): Promise<DirectMessage> => {
  try {
    console.log('📤 [SEND] From:', senderId, 'To:', recipientId, 'Content:', content)

    if (!senderId || !recipientId || !content.trim()) {
      throw new Error('Missing sender, recipient, or content')
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .insert([
        {
          sender_id: senderId,
          recipient_id: recipientId,
          content: content.trim(),
          is_read: false,
        },
      ])
      .select()

    if (error) {
      console.error('❌ [SEND] Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from insert')
    }

    console.log('✅ [SEND] Message sent:', data[0].id)
    return data[0] as DirectMessage
  } catch (error) {
    console.error('❌ [SEND] Exception:', error)
    throw error
  }
}

// Mark messages as read
export const markMessagesAsRead = async (
  userId: string,
  otherUserId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('sender_id', otherUserId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Error marking messages as read:', error)
  }
}

// Update user status
export const updateUserStatus = async (
  userId: string,
  status: 'online' | 'away' | 'offline'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Error updating user status:', error)
  }
}

// Update a direct message
export const updateDirectMessage = async (
  messageId: string,
  content: string
): Promise<DirectMessage> => {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data as DirectMessage
  } catch (error) {
    console.error('❌ Error updating direct message:', error)
    throw error
  }
}

// Delete a direct message
export const deleteDirectMessage = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .eq('id', messageId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Error deleting direct message:', error)
    throw error
  }
}

// Add Reaction
export const addReaction = async (
  messageId: string,
  emoji: string,
  userId: string,
  currentReactions: Record<string, string[]> = {}
): Promise<void> => {
  try {
    const updatedReactions = { ...currentReactions }
    if (!updatedReactions[emoji]) updatedReactions[emoji] = []

    // Toggle reaction
    if (updatedReactions[emoji].includes(userId)) {
      updatedReactions[emoji] = updatedReactions[emoji].filter(id => id !== userId)
      if (updatedReactions[emoji].length === 0) delete updatedReactions[emoji]
    } else {
      updatedReactions[emoji].push(userId)
    }

    const { error } = await supabase
      .from('direct_messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Error adding reaction:', error)
    throw error
  }
}

// POLLING-BASED subscription (Free Tier Compatible)
// Optimized polling: 1.5s normal, 5s on error (backoff)
export const subscribeToMessages = (
  userId: string,
  otherUserId: string,
  callback: (message: DirectMessage) => void
): { unsubscribe: () => void } => {
  let isSubscribed = true
  let lastMessageId = ''
  let pollTimeout: NodeJS.Timeout | null = null
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 3

  const getPollInterval = () => {
    // Exponential backoff on errors: 1.5s → 3s → 5s → 5s (max)
    if (consecutiveErrors === 0) return 1500 // 1.5 seconds
    if (consecutiveErrors === 1) return 3000 // 3 seconds
    return 5000 // 5 seconds max
  }

  const pollMessages = async () => {
    if (!isSubscribed) return

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // "no rows" is not really an error, it just means no messages yet
        if (!error.message.includes('no rows')) {
          console.error('❌ [POLLING] Error:', error)
          consecutiveErrors = Math.min(consecutiveErrors + 1, MAX_CONSECUTIVE_ERRORS)
        } else {
          // Reset error counter on successful poll
          consecutiveErrors = 0

          // If we got a new message different from the last one
          if (data && data.id !== lastMessageId) {
            lastMessageId = data.id
            console.log('📨 [POLLING] New message:', data.id)
            callback(data as DirectMessage)
          }
        }
      } else {
        // Reset error counter on successful poll
        consecutiveErrors = 0

        // If we got a new message different from the last one
        if (data && data.id !== lastMessageId) {
          lastMessageId = data.id
          console.log('📨 [POLLING] New message:', data.id)
          callback(data as DirectMessage)
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ [POLLING] Unexpected error:', error.message)
      }

      consecutiveErrors = Math.min(consecutiveErrors + 1, MAX_CONSECUTIVE_ERRORS)
    }

    // Schedule next poll with adaptive interval
    if (isSubscribed) {
      pollTimeout = setTimeout(pollMessages, getPollInterval())
    }
  }

  // Start polling immediately
  pollMessages()

  // Return unsubscribe function
  return {
    unsubscribe: () => {
      isSubscribed = false
      if (pollTimeout) {
        clearTimeout(pollTimeout)
      }

      console.log('🛑 [POLLING] Unsubscribed')
    },
  }
}
