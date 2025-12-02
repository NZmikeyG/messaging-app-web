import { UUID } from 'crypto';

// User Types
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  status?: string;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

// Channel Types
export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  workspace_id: string;
  parent_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_private: boolean;
}

// Channel Hierarchy (for nested channels with children)
export interface ChannelHierarchy extends Channel {
  children?: ChannelHierarchy[];
}

// Message Types
export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_edited: boolean;
  reactions?: Reaction[];
  user?: UserProfile;
}

// Reaction Types
export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Direct Message Types
export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  user_1_id: string;
  user_2_id: string;
  last_message_id?: string | null;
  last_message_at: string;
  created_at: string;
}

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}