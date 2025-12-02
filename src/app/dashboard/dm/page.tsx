'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { getConversations, Conversation } from '@/lib/supabase/directMessages';
import Link from 'next/link';

export default function DirectMessagesPage() {
  const router = useRouter();
  const { profile } = useUserStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) {
      router.push('/auth/login');
      return;
    }

    loadConversations();
  }, [profile?.id, router]);

  const loadConversations = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getConversations(profile.id);
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const otherUserEmail = conv.other_user?.email || '';
    return otherUserEmail.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const formatLastMessage = (text: string | undefined) => {
    if (!text) return 'No messages yet';
    return text.length > 40 ? `${text.substring(0, 40)}...` : text;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Direct Messages</h1>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 text-white rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-gray-400">No conversations yet</p>
            <p className="text-gray-500 text-sm">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/dm/${conversation.other_user?.id || ''}`}
                className="flex items-center gap-3 p-3 rounded hover:bg-neutral-800 transition cursor-pointer group"
              >
                {/* Status Indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-200">
                      {conversation.other_user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-neutral-900 ${getStatusColor(
                      conversation.other_user?.status || 'offline'
                    )}`}
                  />
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition">
                      {conversation.other_user?.email || 'Unknown'}
                    </h3>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {formatLastMessage(
                      // Get the last message from the conversation
                      // This is a placeholder - you might need to fetch the actual message text
                      'Last message...'
                    )}
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-gray-400 group-hover:text-purple-400 transition">
                  →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}