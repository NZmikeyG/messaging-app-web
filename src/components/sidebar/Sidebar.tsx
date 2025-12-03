'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ChannelList from './ChannelList';
import DirectMessagesList from '@/components/DirectMessages/DirectMessagesList';
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
  const [activeTab, setActiveTab] = useState<'channels' | 'dms' | 'settings'>(
    'channels'
  );

  // Wrap loadChannels in useCallback to avoid dependency issues
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const hierarchy = await getChannelHierarchy(workspaceId);
      setChannels(hierarchy);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const toggleChannelExpanded = (channelId: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channelId)) {
      newExpanded.delete(channelId);
    } else {
      newExpanded.add(channelId);
    }
    setExpandedChannels(newExpanded);
  };

  // Handle New Message button - navigate to DM list
  const handleNewMessage = () => {
    router.push('/dashboard/dm');
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      const response = await fetch('/auth/signout', { method: 'POST' });
      if (response.ok) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      alert('Sign out failed. Please try again.');
    }
  };

  // Show all channels, not just root ones
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col border-r border-gray-700">
      {/* Header */}
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

      {/* Search - Only for Channels */}
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
          <div className="py-3 space-y-2">
            {/* All Messages Link */}
            <Link
              href="/dashboard/dm"
              className="flex items-center justify-between mx-3 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded transition"
            >
              <span>All Messages</span>
              <span className="text-xs">→</span>
            </Link>

            {/* Divider */}
            <div className="px-4">
              <div className="border-t border-gray-700"></div>
            </div>

            {/* Section Header */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Recent
            </div>

            {/* DirectMessagesList Component */}
            <DirectMessagesList onNewMessage={handleNewMessage} />

            {/* New Message Button */}
            <div className="px-4 py-2">
              <button
                onClick={handleNewMessage}
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
              <button
                onClick={() => {
                  alert('🎨 Theme settings - Coming soon!');
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                🎨 Theme
              </button>
              <button
                onClick={() => {
                  alert('🔔 Notifications settings - Coming soon!');
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                🔔 Notifications
              </button>
              <button
                onClick={() => {
                  router.push('/dashboard/profile');
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                👤 Profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 hover:text-red-400 rounded transition"
              >
                🚪 Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}