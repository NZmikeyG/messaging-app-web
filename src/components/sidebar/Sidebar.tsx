// components/Sidebar/Sidebar.tsx

'use client';

import React, { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import DirectMessagesList from './DirectMessagesList';
import { Channel } from '@/lib/types';
import { getChannelHierarchy } from '@/lib/supabase/channels';

interface SidebarProps {
  workspaceId: string;
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  onNewMessage: () => void;
}

export default function Sidebar({
  workspaceId,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onNewMessage,
}: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadChannels();
  }, [workspaceId]);

  async function loadChannels() {
    try {
      setLoading(true);
      const hierarchy = await getChannelHierarchy(workspaceId);
      setChannels(hierarchy);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleChannelExpanded = (channelId: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channelId)) {
      newExpanded.delete(channelId);
    } else {
      newExpanded.add(channelId);
    }
    setExpandedChannels(newExpanded);
  };

  const rootChannels = channels.filter((ch) => !ch.parent_id);

  const filteredChannels = rootChannels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold truncate">My Workspace</h1>
          <button className="p-1 rounded hover:bg-gray-800 transition">
            ⚙️
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <input
          type="text"
          placeholder="🔍 Search channels"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 text-white placeholder-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-3">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Channels
          </div>

          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
          ) : filteredChannels.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">
              No channels found
            </div>
          ) : (
            <ChannelList
              channels={filteredChannels}
              expandedChannels={expandedChannels}
              activeChannelId={activeChannelId}
              onChannelSelect={onChannelSelect}
              onToggleExpanded={toggleChannelExpanded}
              workspaceId={workspaceId}
            />
          )}

          <div className="mt-2 px-4">
            <button
              onClick={onCreateChannel}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
            >
              + Create channel
            </button>
          </div>
        </div>

        {/* Direct Messages */}
        <div className="border-t border-gray-700 py-3">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Direct Messages
          </div>
          <DirectMessagesList onNewMessage={onNewMessage} />
        </div>
      </div>
    </div>
  );
}
