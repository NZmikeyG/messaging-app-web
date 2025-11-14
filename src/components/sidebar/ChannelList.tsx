'use client';

import React from 'react';
import ChannelItem from './ChannelItem';
import { ChannelHierarchy } from '@/lib/types';

interface ChannelListProps {
  channels: ChannelHierarchy[];
  expandedChannels: Set<string>;
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onToggleExpanded: (channelId: string) => void;
  workspaceId: string;
}

export default function ChannelList({
  channels,
  expandedChannels,
  activeChannelId,
  onChannelSelect,
  onToggleExpanded,
  workspaceId,
}: ChannelListProps) {
  // Get only root channels (no parent)
  const rootChannels = channels.filter((ch) => !ch.parent_id);

  if (rootChannels.length === 0) {
    return <div className="px-4 py-2 text-sm text-gray-400">No channels</div>;
  }

  return (
    <div className="space-y-0.5">
      {rootChannels.map((channel) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          channels={channels}
          expandedChannels={expandedChannels}
          activeChannelId={activeChannelId}
          onChannelSelect={onChannelSelect}
          onToggleExpanded={onToggleExpanded}
          depth={0}
        />
      ))}
    </div>
  );
}
