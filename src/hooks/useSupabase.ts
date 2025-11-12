import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Channel, Message } from '@/types'

export function useSupabase() {
  const supabase = createClient()

  // Get all channels
  const getChannels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Channel[]
    } catch (error) {
      console.error('getChannels error:', error)
      throw error
    }
  }, [supabase])

  // Get messages for a channel
  const getMessages = useCallback(
    async (channelId: string) => {
      try {
        // Get messages
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true })

        if (error) throw error

        // Get current user to get email
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        // Map messages with user info from auth
        const messagesWithUsers = messages?.map((msg) => ({
          ...msg,
          user: {
            id: msg.user_id,
            email: msg.user_id === authUser?.id ? authUser.email : 'Unknown User',
          },
        })) || []

        console.log('Messages with users:', messagesWithUsers)

        return messagesWithUsers as Message[]
      } catch (error) {
        console.error('getMessages error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Send a message - FIXED: Explicitly send UTC timestamp
  const sendMessage = useCallback(
    async (channelId: string, content: string, userId: string) => {
      try {
        // Get user's timezone from browser
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Get current UTC time explicitly
        const now = new Date()

        const { data, error } = await supabase.from('messages').insert([
          {
            channel_id: channelId,
            user_id: userId,
            content,
            sender_timezone: userTimezone,
            created_at: now.toISOString(), // Explicitly send ISO string (UTC)
          },
        ])

        if (error) {
          console.error('Insert error:', error)
          throw error
        }

        console.log(
          'Message inserted with timezone:',
          userTimezone,
          'at',
          now.toISOString()
        )
        return data
      } catch (error) {
        console.error('sendMessage error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Subscribe to messages in real-time
  const subscribeToMessages = useCallback(
    (channelId: string, callback: (message: Message) => void) => {
      const subscription = supabase
        .channel(`messages:${channelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId}`,
          },
          (payload: any) => {
            console.log('Real-time message:', payload)
            if (payload.new) {
              callback(payload.new as Message)
            }
          }
        )
        .subscribe()

      return subscription
    },
    [supabase]
  )

  return {
    getChannels,
    getMessages,
    sendMessage,
    subscribeToMessages,
  }
}
