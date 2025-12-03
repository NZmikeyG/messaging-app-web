export interface User {
  id: string
  email: string
  created_at: string
}

export interface Profile {
  id: string
  email?: string  // ← ADD THIS LINE
  username: string
  bio?: string
  avatar_url?: string | null
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  timezone: string
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  name: string
  description?: string
  creator_id: string
  created_at: string
  updated_at: string
  parent_channel_id?: string | null
  isPrivate?: boolean
}

export interface ChannelMember {
  user_id: string
  channel_id: string
}

export interface ChannelRole {
  id: string
  channel_id: string
  user_id: string
  role: 'member' | 'moderator' | 'admin'
  assigned_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
  edited_at?: string | null
  deleted: boolean
  sender_timezone?: string
  user?: {
    id: string
    email: string
  }
  profiles?: {
    id: string
    username: string
    avatar_url?: string
  }
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
  status?: 'online' | 'offline' | 'away'  // ← ADD THIS LINE (optional)
}

export interface ChannelNode {
  id: string
  name: string
  description?: string
  creator_id: string
  created_at: string
  updated_at: string
  parent_channel_id?: string | null
  isPrivate?: boolean
  children?: ChannelNode[]
  level: number
  unreadCount?: number
}

export interface ChannelHierarchy {
  rootChannels: Channel[]
  subChannelsMap: Map<string, Channel[]>
}
