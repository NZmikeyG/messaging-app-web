import { supabase } from './client';

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
  last_message_id: string | null;
  last_message_at: string;
  other_user?: {
    id: string;
    email: string;
    avatar_url: string | null;
    status: string;
  };
}

// Fetch all conversations for a user
export const getConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
};

// Fetch messages between two users
export const getMessages = async (
  userId: string,
  otherUserId: string,
  limit = 50
) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data?.reverse() || [];
};

// Send a direct message
export const sendDirectMessage = async (
  senderId: string,
  recipientId: string,
  content: string
) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content,
    })
    .select()
    .single();

  if (error) throw error;

  // Update or create conversation
  const normalizedUser1 = senderId < recipientId ? senderId : recipientId;
  const normalizedUser2 = senderId < recipientId ? recipientId : senderId;

  await supabase.from('conversations').upsert({
    user_1_id: normalizedUser1,
    user_2_id: normalizedUser2,
    last_message_id: data.id,
    last_message_at: new Date().toISOString(),
  });

  return data;
};

// Mark messages as read
export const markMessagesAsRead = async (
  userId: string,
  otherUserId: string
) => {
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', otherUserId);

  if (error) throw error;
};

// Update user status
export const updateUserStatus = async (
  userId: string,
  status: 'online' | 'away' | 'offline'
) => {
  const { error } = await supabase
    .from('users')
    .update({
      status,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
};

// POLLING-BASED subscription (Free Tier Compatible - NO REAL-TIME NEEDED)
export const subscribeToMessages = (
  userId: string,
  otherUserId: string,
  callback: (message: DirectMessage) => void
): { unsubscribe: () => void } => {
  let isSubscribed = true;
  let lastMessageId = '';
  let pollTimeout: NodeJS.Timeout | null = null;

  const pollMessages = async () => {
    if (!isSubscribed) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If we got a new message different from the last one
      if (data && data.id !== lastMessageId) {
        lastMessageId = data.id;
        callback(data as DirectMessage);
      }
    } catch (error) {
      // Silently catch "no rows" errors
      if (error instanceof Error && !error.message.includes('no rows')) {
        console.error('Error polling messages:', error);
      }
    }

    // Poll every 2 seconds if still subscribed
    if (isSubscribed) {
      pollTimeout = setTimeout(pollMessages, 2000);
    }
  };

  // Start polling
  pollMessages();

  // Return unsubscribe function
  return {
    unsubscribe: () => {
      isSubscribed = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    },
  };
};
