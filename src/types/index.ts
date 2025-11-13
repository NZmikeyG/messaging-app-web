export interface Channel {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
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
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}
