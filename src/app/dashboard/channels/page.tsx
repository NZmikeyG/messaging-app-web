'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import { Channel } from '@/lib/types';

const workspaceId = '2e95c2c3-10f1-472a-8b51-5aefe3938185';

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [isParent, setIsParent] = useState(true);
  const profile = useUserStore((state) => state.profile);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('workspace_id', workspaceId);
      setChannels((data as Channel[]) || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim() || !profile?.id) return;

    try {
      const { error } = await supabase.from('channels').insert({
        workspace_id: workspaceId,
        name: channelName,
        creator_id: profile.id,
        is_private: false,
        parent_id: null,
      });

      if (error) throw error;

      setChannelName('');
      setShowCreateModal(false);
      await loadChannels();
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const rootChannels = channels.filter((ch) => !ch.parent_id);

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Channels</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create Channel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : rootChannels.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No channels yet. Create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rootChannels.map((channel) => {
            const subChannels = channels.filter(
              (ch) => ch.parent_id === channel.id
            );
            return (
              <div
                key={channel.id}
                onClick={() => router.push(`/dashboard/channel/${channel.id}`)}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-lg cursor-pointer transition"
              >
                <h3 className="font-bold text-lg">#{channel.name}</h3>
                <p className="text-sm text-gray-600 mt-2">
                  {channel.description || 'No description'}
                </p>
                {subChannels.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      Sub-channels ({subChannels.length})
                    </p>
                    <div className="space-y-1">
                      {subChannels.slice(0, 3).map((sub) => (
                        <div
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/channel/${sub.id}`);
                          }}
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                          #{sub.name}
                        </div>
                      ))}
                      {subChannels.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{subChannels.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create Channel</h2>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
