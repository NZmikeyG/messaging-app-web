import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Channel, ChannelNode, ChannelHierarchy } from '@/types'

interface ChannelStore {
  channels: Channel[]
  channelHierarchy: ChannelHierarchy | null
  selectedChannelId: string | null
  isLoading: boolean
  error: string | null

  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: string, updates: Partial<Channel>) => void
  deleteChannel: (channelId: string) => void
  setSelectedChannel: (channelId: string | null) => void
  setChannelHierarchy: (hierarchy: ChannelHierarchy) => void
  getChannelById: (channelId: string) => Channel | undefined
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearChannels: () => void
}

export const useChannelStore = create<ChannelStore>()(
  persist(
    (set, get) => ({
      channels: [],
      channelHierarchy: null,
      selectedChannelId: null,
      isLoading: false,
      error: null,

      setChannels: (channels) => set({ channels, error: null }),

      addChannel: (channel) =>
        set((state) => ({
          channels: [...state.channels, channel],
          error: null,
        })),

      updateChannel: (channelId, updates) =>
        set((state) => ({
          channels: state.channels.map((ch) =>
            ch.id === channelId ? { ...ch, ...updates } : ch
          ),
          error: null,
        })),

      deleteChannel: (channelId) =>
        set((state) => ({
          channels: state.channels.filter((ch) => ch.id !== channelId),
          selectedChannelId:
            state.selectedChannelId === channelId ? null : state.selectedChannelId,
          error: null,
        })),

      setSelectedChannel: (channelId) =>
        set({ selectedChannelId: channelId, error: null }),

      setChannelHierarchy: (hierarchy) =>
        set({ channelHierarchy: hierarchy, error: null }),

      getChannelById: (channelId) => {
        return get().channels.find((ch) => ch.id === channelId)
      },

      setIsLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearChannels: () =>
        set({
          channels: [],
          channelHierarchy: null,
          selectedChannelId: null,
          error: null,
        }),
    }),
    {
      name: 'channel-store',
      partialize: (state) => ({
        channels: state.channels,
        channelHierarchy: state.channelHierarchy,
        selectedChannelId: state.selectedChannelId,
      }),
    }
  )
)