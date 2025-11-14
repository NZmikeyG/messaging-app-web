import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, MessageReaction } from '@/types'

interface MessageStore {
  messages: Message[]
  messageReactions: Map<string, MessageReaction[]>
  isLoading: boolean
  error: string | null

  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  deleteMessage: (messageId: string) => void
  addReaction: (reaction: MessageReaction) => void
  removeReaction: (messageId: string, reactionId: string) => void
  getReactionsForMessage: (messageId: string) => MessageReaction[]
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: [],
      messageReactions: new Map(),
      isLoading: false,
      error: null,

      setMessages: (messages) => set({ messages, error: null }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
          error: null,
        })),

      updateMessage: (messageId, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
          error: null,
        })),

      deleteMessage: (messageId) =>
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== messageId),
          error: null,
        })),

      addReaction: (reaction) =>
        set((state) => {
          const currentReactions = state.messageReactions.get(reaction.message_id) || []
          const updated = new Map(state.messageReactions)
          updated.set(reaction.message_id, [...currentReactions, reaction])
          return { messageReactions: updated, error: null }
        }),

      removeReaction: (messageId, reactionId) =>
        set((state) => {
          const currentReactions = state.messageReactions.get(messageId) || []
          const updated = new Map(state.messageReactions)
          updated.set(
            messageId,
            currentReactions.filter((r) => r.id !== reactionId)
          )
          return { messageReactions: updated, error: null }
        }),

      getReactionsForMessage: (messageId) => {
        return get().messageReactions.get(messageId) || []
      },

      setIsLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearMessages: () =>
        set({
          messages: [],
          messageReactions: new Map(),
          error: null,
        }),
    }),
    {
      name: 'message-store',
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
)