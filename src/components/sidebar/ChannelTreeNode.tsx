'use client'

import React from 'react'
import { useChannelStore } from '@/store/useChannelStore'
import type { ChannelNode } from '@/types'
import './ChannelTreeNode.css'

interface ChannelTreeNodeProps {
  node: ChannelNode
}

const ChannelTreeNode: React.FC<ChannelTreeNodeProps> = ({ node }) => {
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
  }

  return (
    <li
      className={`channel-tree-node level-${node.level}`}
      style={{ paddingLeft: `${node.level * 16}px` }}
    >
      <div
        className={`channel-item ${isSelected ? 'selected' : ''} ${
          node.isPrivate ? 'private' : ''
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

        <span className='channel-icon'>{node.isPrivate ? '🔒' : '#'}</span>
        <span className='channel-name'>{node.name}</span>

        {node.unreadCount && node.unreadCount > 0 && (
          <span className='unread-badge'>{node.unreadCount}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className='channel-children'>
          {node.children!.map((child) => (
            <ChannelTreeNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default ChannelTreeNode