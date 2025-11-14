import type { Profile } from '@/types'
import { useCallback } from 'react'
import type { Channel, Message, MessageReaction } from '@/types'

export function useSupabase() {
  const getChannels = useCallback(async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

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
  }, [])

  const getMessages = useCallback(
    async (channelId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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
            email:
              msg.user_id === authUser?.id && authUser
                ? authUser.email
                : 'Unknown User',
          },
        })) || []

        return messagesWithUsers as Message[]
      } catch (error) {
        console.error('getMessages error:', error)
        throw error
      }
    },
    []
  )

  const sendMessage = useCallback(
    async (channelId: string, content: string, userId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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

        return data
      } catch (error) {
        console.error('sendMessage error:', error)
        throw error
      }
    },
    []
  )

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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

        return data
      } catch (error) {
        console.error('editMessage error:', error)
        throw error
      }
    },
    []
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from('messages')
          .update({ deleted: true })
          .eq('id', messageId)

        if (error) {
          console.error('Delete message error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('deleteMessage error:', error)
        throw error
      }
    },
    []
  )

  const addReaction = useCallback(
    async (messageId: string, emoji: string, userId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from('message_reactions')
          .insert([
            {
              message_id: messageId,
              user_id: userId,
              emoji,
            },
          ])

        if (error) {
          if (error.code === '23505') {
            return null
          }
          console.error('Add reaction error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('addReaction error:', error)
        throw error
      }
    },
    []
  )

  const removeReaction = useCallback(
    async (messageId: string, emoji: string, userId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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

        return data
      } catch (error) {
        console.error('removeReaction error:', error)
        throw error
      }
    },
    []
  )

  const getReactions = useCallback(
    async (messageId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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
    []
  )

  const subscribeToMessages = useCallback(
    (channelId: string, callback: (message: Message) => void) => {
      const initSubscription = async () => {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const subscription = supabase
          .channel(`messages:${channelId}`)
          .on(
            'postgres_changes' as never,
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `channel_id=eq.${channelId}`,
            },
            (payload: { new?: Message; old?: Message; eventType: string }) => {
              if (payload.new) {
                callback(payload.new as Message)
              }
            }
          )
          .subscribe()

        return subscription
      }

      initSubscription()
      return undefined
    },
    []
  )

  const createChannel = useCallback(
    async (channelData: {
      name: string
      description?: string
      is_private?: boolean
      parent_channel_id?: string
    }) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error('User not authenticated')

        const { data, error } = await supabase
          .from('channels')
          .insert([
            {
              name: channelData.name,
              description: channelData.description || null,
              is_private: channelData.is_private || false,
              creator_id: user.id,
              parent_channel_id: channelData.parent_channel_id || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (error) throw error
        return data as Channel
      } catch (error) {
        console.error('createChannel error:', error)
        throw error
      }
    },
    []
  )

  const updateChannel = useCallback(
    async (channelId: string, updates: Partial<Channel>) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from('channels')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', channelId)
          .select()
          .single()

        if (error) throw error
        return data as Channel
      } catch (error) {
        console.error('updateChannel error:', error)
        throw error
      }
    },
    []
  )

  const deleteChannel = useCallback(
    async (channelId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { error } = await supabase
          .from('channels')
          .delete()
          .eq('id', channelId)

        if (error) throw error
      } catch (error) {
        console.error('deleteChannel error:', error)
        throw error
      }
    },
    []
  )

  const getProfile = useCallback(
    async (userId: string) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        return data as Profile
      } catch (error) {
        console.error('getProfile error:', error)
        throw error
      }
    },
    []
  )

  const updateProfile = useCallback(
    async (userId: string, updates: Partial<Profile>) => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single()

        if (error) throw error
        return data as Profile
      } catch (error) {
        console.error('updateProfile error:', error)
        throw error
      }
    },
    []
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
    createChannel,
    updateChannel,
    deleteChannel,
    getProfile,
    updateProfile,
  }
}
