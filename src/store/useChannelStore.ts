import { create } from 'zustand'
import type { Channel, ChannelNode } from '@/types'

interface ChannelStore {
channels: Channel[]
selectedChannelId: string | null
expandedChannels: Set<string>
isLoading: boolean
error: string | null

// Actions
setChannels: (channels: Channel[]) => void
setSelectedChannel: (channelId: string | null) => void
toggleChannelExpanded: (channelId: string) => void
setIsLoading: (loading: boolean) => void
setError: (error: string | null) => void
addChannel: (channel: Channel) => void
deleteChannel: (channelId: string) => void
updateChannel: (channelId: string, updates: Partial<Channel>) => void

// Hierarchical helpers
getRootChannels: () => Channel[]
getSubChannels: (parentChannelId: string) => Channel[]
buildChannelTree: () => ChannelNode[]
isChannelExpanded: (channelId: string) => boolean
getChannelPath: (channelId: string) => string

// Error handling
clearError: () => void
}

export const useChannelStore = create<ChannelStore>((set, get) => ({
channels: [],
selectedChannelId: null,
expandedChannels: new Set(),
isLoading: false,
error: null,

setChannels: (channels) => {
set({ channels })
},

setSelectedChannel: (channelId) => {
set({ selectedChannelId: channelId })
},

toggleChannelExpanded: (channelId) => {
set((state) => {
const newExpanded = new Set(state.expandedChannels)
if (newExpanded.has(channelId)) {
newExpanded.delete(channelId)
} else {
newExpanded.add(channelId)
}
return { expandedChannels: newExpanded }
})
},

setIsLoading: (loading) => set({ isLoading: loading }),

setError: (error) => set({ error }),

addChannel: (channel) => {
set((state) => ({
channels: [...state.channels, channel],
}))
},

deleteChannel: (channelId) => {
set((state) => ({
channels: state.channels.filter((ch) => ch.id !== channelId),
}))
},

updateChannel: (channelId, updates) => {
set((state) => ({
channels: state.channels.map((ch) =>
ch.id === channelId ? { ...ch, ...updates } : ch
),
}))
},

getRootChannels: () => {
return get().channels.filter((ch) => !ch.parent_channel_id)
},

getSubChannels: (parentChannelId) => {
return get().channels.filter(
(ch) => ch.parent_channel_id === parentChannelId
)
},

buildChannelTree: () => {
const state = get()
const buildNode = (channel: Channel, level: number = 0): ChannelNode => {
const children = state.getSubChannels(channel.id)
return {
...channel,
level,
children:
children.length > 0
? children.map((child) => buildNode(child, level + 1))
: undefined,
}
}
return state.getRootChannels().map((ch) => buildNode(ch, 0))
},

isChannelExpanded: (channelId) => {
return get().expandedChannels.has(channelId)
},

getChannelPath: (channelId) => {
const channels = get().channels
const channel = channels.find((ch) => ch.id === channelId)
if (!channel) return ''
const path = [channel.name]
let current = channel

while (current.parent_channel_id) {
  const parent = channels.find(
    (ch) => ch.id === current.parent_channel_id
  )
  if (parent) {
    path.unshift(parent.name)
    current = parent
  } else {
    break
  }
}

return path.join(' / ')
},

clearError: () => {
set({ error: null })
},
}))