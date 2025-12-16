export interface User {
  id: string
  email: string
  created_at: string
}

export interface Profile {
  id: string
  email?: string
  username: string
  bio?: string
  avatar_url?: string | null
  theme?: 'light' | 'dark'
  notifications_enabled?: boolean
  timezone?: string
  status?: string
  last_seen?: string
  created_at?: string
  updated_at?: string
  workspace_id?: string
}

export interface Channel {
  id: string
  name: string
  description?: string | null
  workspace_id?: string
  creator_id: string
  created_at: string
  updated_at: string
  parent_id?: string | null
  is_private: boolean
}

export interface ChannelMember {
  user_id: string
  channel_id: string
  role: 'owner' | 'moderator' | 'member'
  joined_at?: string
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
    username?: string
    avatar_url?: string
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
  status?: 'online' | 'offline' | 'away'
}

// Channel Hierarchy (for nested channels with children)
export interface ChannelHierarchy extends Channel {
  children?: ChannelHierarchy[];
}

export interface ChannelNode {
  id: string
  name: string
  description?: string | null
  creator_id: string
  created_at: string
  updated_at: string
  parent_id?: string | null
  is_private?: boolean
  children?: ChannelNode[]
  level: number
  unreadCount?: number
}

export type UserProfile = Profile

