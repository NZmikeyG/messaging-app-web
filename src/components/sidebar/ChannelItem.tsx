// components/Sidebar/ChannelList.tsx

'use client';

import React from 'react';
import ChannelItem from './ChannelItem';
import { Channel } from '@/lib/types';

interface ChannelListProps {
  channels: Channel[];
  expandedChannels: Set<string>;
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onToggleExpanded: (channelId: string) => void;
  workspaceId: string;
  depth?: number;
  parentId?: string | null;
}

export default function ChannelList({
  channels,
  expandedChannels,
  activeChannelId,
  onChannelSelect,
  onToggleExpanded,
  workspaceId,
  depth = 0,
  parentId = null,
}: ChannelListProps) {
  // Filter channels to show only those at current depth level
  const currentLevelChannels = channels.filter(
    (ch) => ch.parent_id === parentId
  );

  return (
    <>
      {currentLevelChannels.map((channel) => {
        // Get sub-channels for this channel
        const hasSubChannels = channels.some(
          (ch) => ch.parent_id === channel.id
        );
        const isExpanded = expandedChannels.has(channel.id);
        const isActive = activeChannelId === channel.id;

        return (
          <div key={channel.id}>
            <ChannelItem
              channel={channel}
              hasSubChannels={hasSubChannels}
              isExpanded={isExpanded}
              isActive={isActive}
              depth={depth}
              onSelect={() => onChannelSelect(channel.id)}
              onToggleExpanded={() => onToggleExpanded(channel.id)}
            />

            {/* Render sub-channels recursively */}
            {hasSubChannels && isExpanded && (
              <ChannelList
                channels={channels}
                expandedChannels={expandedChannels}
                activeChannelId={activeChannelId}
                onChannelSelect={onChannelSelect}
                onToggleExpanded={onToggleExpanded}
                workspaceId={workspaceId}
                depth={depth + 1}
                parentId={channel.id}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
