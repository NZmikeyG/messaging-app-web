'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import { Channel } from '@/types';
import { deleteChannel, updateChannel, createChannel, addChannelMember } from '@/lib/supabase/channels';
import { CreateChannelModal } from '@/components/Sidebar/CreateChannelModal';

const workspaceId = '2e95c2c3-10f1-472a-8b51-5aefe3938185';

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleCreateChannelSubmit = async (
    name: string,
    description?: string,
    isPrivate?: boolean,
    members?: string[]
  ) => {
    try {
      if (!profile?.id) return;
      const newChannel = await createChannel({
        workspaceId,
        name,
        description,
        isPrivate,
      });

      if (members && members.length > 0) {
        for (const userId of members) {
          await addChannelMember(newChannel.id, userId, 'member');
        }
      }

      await loadChannels();
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  const handleRename = async (channelId: string, currentName: string) => {
    const newName = window.prompt("Enter new name:", currentName);
    if (newName && newName.trim() && newName !== currentName) {
      try {
        await updateChannel(channelId, { name: newName.trim() });
        loadChannels();
      } catch (e) { alert("Failed to rename"); }
    }
  }

  const handleDelete = async (channelId: string) => {
    if (window.confirm("Are you sure? This deletes all subchannels and messages.")) {
      try {
        await deleteChannel(channelId);
        loadChannels();
      } catch (e) { alert("Failed to delete channel. Check permissions."); }
    }
  }

  const rootChannels = channels.filter((ch) => !ch.parent_id);

  return (
    <div className="flex-1 p-8 bg-gray-900 text-white min-h-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Channels</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 hover:shadow-lg cursor-pointer transition relative group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">#{channel.name}</h3>
                    <p className="text-sm text-gray-400 mt-2">
                      {channel.description || 'No description'}
                    </p>
                  </div>
                  {/* Action Buttons for Card */}
                  <div className="flex gap-2">
                    <button
                      className="text-gray-500 hover:text-white p-1"
                      onClick={(e) => { e.stopPropagation(); handleRename(channel.id, channel.name); }}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-400 p-1"
                      onClick={(e) => { e.stopPropagation(); handleDelete(channel.id); }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {subChannels.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
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
                          className="text-xs text-purple-400 hover:underline cursor-pointer flex justify-between group/sub"
                        >
                          <span>#{sub.name}</span>
                          {/* Subchannel actions */}
                          <div className="flex opacity-0 group-hover/sub:opacity-100 gap-2">
                            <button
                              className="text-gray-500 hover:text-white"
                              onClick={(e) => { e.stopPropagation(); handleRename(sub.id, sub.name); }}
                              title="Rename"
                            >✎</button>
                            <button
                              className="text-gray-600 hover:text-red-400"
                              onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                              title="Delete"
                            >x</button>
                          </div>
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

      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateChannel={handleCreateChannelSubmit}
      />
    </div>
  );
}
