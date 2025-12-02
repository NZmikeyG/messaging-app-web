'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { getConversations, Conversation } from '@/lib/supabase/directMessages';
import Link from 'next/link';

interface DirectMessagesListProps {
  onNewMessage: () => void;
}

export default function DirectMessagesList({ onNewMessage }: DirectMessagesListProps) {
  const router = useRouter();
  const { profile } = useUserStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    loadConversations();

    // Refresh conversations every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  const loadConversations = async () => {
    if (!profile?.id) return;

    try {
      const data = await getConversations(profile.id);
      setConversations(data.slice(0, 5)); // Show only top 5 conversations in sidebar
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-gray-400">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/dashboard/dm/${conversation.other_user?.id || ''}`}
          className="flex items-center gap-2 p-2 rounded hover:bg-neutral-700 transition text-sm text-gray-300 hover:text-white group"
        >
          {/* Status Indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center text-xs">
              {conversation.other_user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-900 ${getStatusColor(
                conversation.other_user?.status || 'offline'
              )}`}
            />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate group-hover:text-purple-400">
              {conversation.other_user?.email || 'Unknown'}
            </p>
          </div>

          {/* Unread Indicator (placeholder) */}
          {/* <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" /> */}
        </Link>
      ))}

      {/* View All Link */}
      <Link
        href="/dashboard/dm"
        className="block px-2 py-2 text-sm text-purple-400 hover:text-purple-300 transition text-center mt-2 border-t border-neutral-700 pt-2"
      >
        View all conversations →
      </Link>
    </div>
  );
}