import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Channel, Message, MessageReaction } from '@/types'

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
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true })

        if (error) throw error

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

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

  // Send a message
  const sendMessage = useCallback(
    async (channelId: string, content: string, userId: string) => {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const now = new Date()

        const { data, error } = await supabase.from('messages').insert([
          {
            channel_id: channelId,
            user_id: userId,
            content,
            sender_timezone: userTimezone,
            created_at: now.toISOString(),
          },
        ])

        if (error) {
          console.error('Insert error:', error)
          throw error
        }

        console.log('Message inserted with timezone:', userTimezone)
        return data
      } catch (error) {
        console.error('sendMessage error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Edit a message (only own messages)
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .update({
            content: newContent,
            edited_at: new Date().toISOString(),
          })
          .eq('id', messageId)

        if (error) {
          console.error('Edit message error:', error)
          throw error
        }

        console.log('Message edited:', messageId)
        return data
      } catch (error) {
        console.error('editMessage error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Delete a message (soft delete)
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .update({ deleted: true })
          .eq('id', messageId)

        if (error) {
          console.error('Delete message error:', error)
          throw error
        }

        console.log('Message deleted:', messageId)
        return data
      } catch (error) {
        console.error('deleteMessage error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Add reaction to message
  const addReaction = useCallback(
    async (messageId: string, emoji: string, userId: string) => {
      try {
        const { data, error } = await supabase.from('message_reactions').insert([
          {
            message_id: messageId,
            user_id: userId,
            emoji,
          },
        ])

        if (error) {
          if (error.code === '23505') {
            console.log('Reaction already exists')
            return null
          }
          console.error('Add reaction error:', error)
          throw error
        }

        console.log('Reaction added:', emoji)
        return data
      } catch (error) {
        console.error('addReaction error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Remove reaction from message
  const removeReaction = useCallback(
    async (messageId: string, emoji: string, userId: string) => {
      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('emoji', emoji)

        if (error) {
          console.error('Remove reaction error:', error)
          throw error
        }

        console.log('Reaction removed:', emoji)
        return data
      } catch (error) {
        console.error('removeReaction error:', error)
        throw error
      }
    },
    [supabase]
  )

  // Get reactions for a message
  const getReactions = useCallback(
    async (messageId: string) => {
      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', messageId)

        if (error) throw error

        return data as MessageReaction[]
      } catch (error) {
        console.error('getReactions error:', error)
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
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    getReactions,
    subscribeToMessages,
  }
}
