'use client';

import React from 'react';
import { Channel } from '@/types';

interface ChannelItemProps {
  channel: Channel;
  channels: Channel[];
  expandedChannels: Set<string>;
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onToggleExpanded: (channelId: string) => void;
  depth: number;
}

export default function ChannelItem({
  channel,
  channels,
  expandedChannels,
  activeChannelId,
  onChannelSelect,
  onToggleExpanded,
  depth,
}: ChannelItemProps) {
  // Get child channels
  const childChannels = channels.filter((ch) => ch.parent_id === channel.id);
  const hasChildren = childChannels.length > 0;
  const isExpanded = expandedChannels.has(channel.id);
  const isActive = activeChannelId === channel.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(channel.id);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded cursor-pointer transition-colors mx-1 ${isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-800'
          }`}
        onClick={() => onChannelSelect(channel.id)}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="p-0 w-4 h-4 flex items-center justify-center shrink-0 hover:text-white"
            title={isExpanded ? 'Collapse' : 'Expand'}
            type="button"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Channel Hashtag */}
        <span className="text-sm flex-1 truncate">#{channel.name}</span>

        {/* Add sub-channel button for parents */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open create sub-channel dialog
              console.log('Create sub-channel for:', channel.id);
            }}
            className="p-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white shrink-0"
            title="Create sub-channel"
            type="button"
          >
            +
          </button>
        )}
      </div>

      {/* Child Channels */}
      {hasChildren && isExpanded && (
        <div>
          {childChannels.map((childChannel) => (
            <ChannelItem
              key={childChannel.id}
              channel={childChannel}
              channels={channels}
              expandedChannels={expandedChannels}
              activeChannelId={activeChannelId}
              onChannelSelect={onChannelSelect}
              onToggleExpanded={onToggleExpanded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
