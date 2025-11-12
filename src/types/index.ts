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
  updated_at: string
  user?: {
    id: string
    email: string
  }
}

export interface User {
  id: string
  email: string
  created_at: string
}
