'use client'

import React from 'react'
import { useChannelStore } from '@/store/useChannelStore'
import type { ChannelNode } from '@/types'
import './ChannelTreeNode.css'

interface ChannelTreeNodeProps {
  node: ChannelNode
  onSelect?: (channelId: string) => void
  onAddSubChannel?: (parentId: string) => void
  onRename?: (channelId: string, currentName: string) => void
  onDelete?: (channelId: string) => void
}

const ChannelTreeNode: React.FC<ChannelTreeNodeProps> = ({
  node,
  onSelect,
  onAddSubChannel,
  onRename,
  onDelete
}) => {
  const {
    selectedChannelId,
    expandedChannels,
    toggleChannelExpanded,
    setSelectedChannel,
  } = useChannelStore()

  const isExpanded = expandedChannels.has(node.id)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedChannelId === node.id

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      toggleChannelExpanded(node.id)
    }
  }

  const handleSelectChannel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedChannel(node.id)
    onSelect?.(node.id)
  }

  return (
    <li
      className={`channel-tree-node level-${node.level}`}
      style={{ paddingLeft: `${node.level * 24}px` }} // Increased indentation
    >
      <div
        className={`channel-item group relative cursor-pointer ${isSelected ? 'selected' : ''} ${node.is_private ? 'private' : ''
          }`}
        onClick={handleSelectChannel}
      >
        {hasChildren && (
          <button
            className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggleExpand}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className='chevron'>▶</span>
          </button>
        )}
        {!hasChildren && <span className='expand-placeholder'></span>}

        <span className='channel-icon'>{node.is_private ? '🔒' : '#'}</span>
        <span className='channel-name flex-1 truncate'>{node.name}</span>

        {/* Channel Actions (Visible on Hover) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 rounded flex gap-1 items-center z-10 shadow-lg border border-gray-700">
          {/* Add Sub Channel */}
          <button
            className="p-1 hover:text-white text-gray-400"
            title="Add sub-channel"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onAddSubChannel?.(node.id)
            }}
          >
            <span className="text-xs">+</span>
          </button>
          {/* Rename (Admin) */}
          <button
            className="p-1 hover:text-white text-gray-400"
            title="Rename channel"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onRename?.(node.id, node.name)
            }}
          >
            <span className="text-xs">✎</span>
          </button>
          {/* Delete (Admin) */}
          <button
            className="p-1 hover:text-red-500 text-gray-400"
            title="Delete channel"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDelete?.(node.id)
            }}
          >
            <span className="text-xs">🗑️</span>
          </button>
        </div>

        {node.unreadCount && node.unreadCount > 0 && (
          <span className='unread-badge'>{node.unreadCount}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className='channel-children'>
          {node.children!.map((child) => (
            <ChannelTreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              onAddSubChannel={onAddSubChannel}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default ChannelTreeNode