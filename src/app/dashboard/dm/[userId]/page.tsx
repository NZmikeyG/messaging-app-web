'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import DMConversation from '@/components/DirectMessages/DMConversation';
import { supabase } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types';

export default function DirectMessageConversationPage() {
  const router = useRouter();
  const params = useParams();
  const { profile } = useUserStore();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId as string;

  useEffect(() => {
    if (!profile?.id) {
      router.push('/auth/login');
      return;
    }

    if (!userId) {
      router.push('/dashboard/dm');
      return;
    }

    fetchOtherUser();
  }, [profile?.id, userId, router]);

  const fetchOtherUser = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (err) throw err;

      setOtherUser(data as UserProfile);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <p className="text-gray-400">Loading conversation...</p>
      </div>
    );
  }

  if (error || !otherUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-neutral-900 gap-4">
        <p className="text-red-400">{error || 'Failed to load conversation'}</p>
        <button
          onClick={() => router.push('/dashboard/dm')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4 flex items-center justify-between bg-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/dm')}
            className="text-gray-400 hover:text-white transition"
            title="Back"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{otherUser.email}</h1>
            <p className={`text-xs ${otherUser.status === 'online' ? 'text-green-400' : 'text-gray-400'}`}>
              {otherUser.status === 'online' ? '● Online' : '○ Offline'}
            </p>
          </div>
        </div>

        {/* View Profile Button */}
        <button
          onClick={() => router.push(`/profile/${userId}`)}
          className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 text-gray-300 rounded transition"
        >
          Profile
        </button>
      </div>

      {/* Conversation */}
      {profile?.id && (
        <DMConversation
          recipientId={userId}
          recipientName={otherUser.email || 'User'}
          recipientStatus={otherUser.status || 'offline'}
        />
      )}
    </div>
  );
}