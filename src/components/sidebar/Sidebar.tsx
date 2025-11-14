'use client';

import React, { useEffect, useState } from 'react';
import ChannelList from './ChannelList';
import DirectMessagesList from './DirectMessagesList';
import { Channel } from '@/lib/types';
import { getChannelHierarchy } from '@/lib/supabase/channels';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'channels' | 'dms' | 'settings'>('channels');

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

  // Show all channels, not just root ones
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rootChannels = filteredChannels.filter((ch) => !ch.parent_id);

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col border-r border-gray-700">
      {/* Header - FIXED: No nested buttons */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between gap-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 text-left hover:opacity-80 transition"
          title="Back to dashboard"
        >
          <h1 className="text-lg font-bold truncate">My Workspace</h1>
        </button>
        <button 
          className="p-1 rounded hover:bg-gray-800 transition flex-shrink-0"
          title="Settings"
          onClick={() => setActiveTab('settings')}
        >
          ⚙️
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 px-2 py-2 gap-1">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'channels'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💬 Channels
        </button>
        <button
          onClick={() => setActiveTab('dms')}
          className={`px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'dms'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📧 DMs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'settings'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Search */}
      {activeTab === 'channels' && (
        <div className="p-3 border-b border-gray-700">
          <input
            type="text"
            placeholder="🔍 Search channels"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white placeholder-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* CHANNELS TAB */}
        {activeTab === 'channels' && (
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
        )}

        {/* DMS TAB */}
        {activeTab === 'dms' && (
          <div className="py-3">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Direct Messages
            </div>
            <DirectMessagesList onNewMessage={onNewMessage} />
            <div className="mt-2 px-4">
              <button
                onClick={onNewMessage}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                + New message
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="py-3">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </div>
            <div className="px-4 py-3 space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition">
                🎨 Theme
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition">
                🔔 Notifications
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition">
                👤 Profile
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition">
                🚪 Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
