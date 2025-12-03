import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  updated_at: string
  is_read: boolean
}

export interface Conversation {
  id: string
  user_1_id: string
  user_2_id: string
  last_message_id: string | null
  last_message_at: string
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
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error fetching messages:', error)
      return []
    }

    // Group conversations and get latest message from each user
    const conversationMap = new Map<string, Conversation>()

    data?.forEach((msg) => {
      const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id

      // Skip if we already have a conversation with this user
      if (conversationMap.has(otherUserId)) return

      conversationMap.set(otherUserId, {
        id: msg.id,
        user_1_id: userId,
        user_2_id: otherUserId,
        last_message_id: msg.id,
        last_message_at: msg.created_at,
        other_user: undefined,
      })
    })

    // Fetch user info for each conversation
    const userIds = Array.from(conversationMap.keys())

    if (userIds.length === 0) return []

    console.log('🔵 Fetching user data for conversations:', userIds)

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, status')
      .in('id', userIds)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return Array.from(conversationMap.values())
    }

    // Map user data to conversations
    const conversations = Array.from(conversationMap.values()).map((conv) => {
      const userData = usersData?.find((u) => u.id === conv.user_2_id)
      if (userData) {
        conv.other_user = {
          id: userData.id,
          email: userData.email || 'Unknown',
          username: userData.username || userData.email?.split('@')[0] || 'User',
          avatar_url: userData.avatar_url || null,
          status: userData.status || 'offline',
        }
        console.log('✅ User mapped:', {
          id: userData.id,
          username: userData.username,
          email: userData.email,
        })
      }
      return conv
    })

    console.log('✅ Conversations fetched with user data:', conversations.length)
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
): Promise<DirectMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data?.reverse() || []
  } catch (error) {
    console.error('Error fetching messages:', error)
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
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
      })
      .select()
      .single()

    if (error) throw error

    // Update or create conversation
    const normalizedUser1 = senderId < recipientId ? senderId : recipientId
    const normalizedUser2 = senderId < recipientId ? recipientId : senderId

    await supabase.from('conversations').upsert({
      user_1_id: normalizedUser1,
      user_2_id: normalizedUser2,
      last_message_id: data.id,
      last_message_at: new Date().toISOString(),
    })

    return data
  } catch (error) {
    console.error('Error sending message:', error)
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
    console.error('Error marking messages as read:', error)
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
    console.error('Error updating user status:', error)
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
          console.error('Error polling messages:', error)
          consecutiveErrors = Math.min(consecutiveErrors + 1, MAX_CONSECUTIVE_ERRORS)
        }
        // Reset consecutive errors on "no rows" success
      } else {
        // Reset error counter on successful poll
        consecutiveErrors = 0

        // If we got a new message different from the last one
        if (data && data.id !== lastMessageId) {
          lastMessageId = data.id
          callback(data as DirectMessage)
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Unexpected error polling messages:', error.message)
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
    },
  }
}
