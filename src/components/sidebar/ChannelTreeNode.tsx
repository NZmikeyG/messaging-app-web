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

  // Initialize expansion state from localStorage or default to expanded
  React.useEffect(() => {
    if (hasChildren) {
      const storedState = localStorage.getItem(`channel_expanded_${node.id}`)
      // If no stored state, default to true (expanded). Otherwise parse stored string.
      const shouldBeExpanded = storedState === null ? true : storedState === 'true'

      // Sync with store if different
      if (shouldBeExpanded !== isExpanded) {
        toggleChannelExpanded(node.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, hasChildren]) // Intentionally omitting toggleChannelExpanded/isExpanded to prevent toggle loops on sync

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      const newState = !isExpanded
      toggleChannelExpanded(node.id)
      localStorage.setItem(`channel_expanded_${node.id}`, String(newState))
    }
  }

  const handleSelectChannel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedChannel(node.id)
    onSelect?.(node.id)
  }

  const bubbleClass = node.level === 0
    ? "mb-2 border theme-border-secondary rounded-xl overflow-hidden theme-bg-secondary"
    : ""

  return (
    <li className={`channel-tree-node level-${node.level} ${bubbleClass}`}>
      <div
        className={`
          flex items-center gap-2 py-1.5 pr-2 cursor-pointer transition-colors relative group
          ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-gray-800/50 theme-text-secondary hover:theme-text-primary'}
          ${node.level === 0 ? 'px-3 font-semibold' : 'text-sm'}
        `}
        style={{ paddingLeft: node.level === 0 ? '12px' : `${(node.level * 20) + 12}px` }}
        onClick={handleSelectChannel}
      >
        {/* Expand/Collapse Chevron */}
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={handleToggleExpand}
        >
          {hasChildren ? (
            <span className={`text-[10px] transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-700" />
          )}
        </div>

        {/* Icon & Name */}
        <span className="shrink-0 opacity-70">
          {node.is_private && '🔒'}
        </span>
        <span className="truncate flex-1 select-none">
          {node.name}
        </span>

        {/* Actions (visible on group hover) */}
        <div className="hidden group-hover:flex items-center gap-1 theme-bg-secondary rounded px-1 absolute right-2 shadow-sm border theme-border-secondary z-[100]">
          <button
            className="p-1 hover:text-white text-gray-400"
            title="Add sub-channel"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Add clicked for', node.name)
              onAddSubChannel?.(node.id)
            }}
          >
            <span className="text-xs font-bold">+</span>
          </button>
          <button
            className="p-1 hover:text-white text-gray-400"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Rename clicked for', node.name)
              onRename?.(node.id, node.name)
            }}
          >
            <span className="text-xs">✎</span>
          </button>
          <button
            className="p-1 hover:text-red-400 text-gray-400"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Delete button clicked for', node.name)
              // Temporary alert to debug click
              // alert('Delete clicked for ' + node.name)
              onDelete?.(node.id)
            }}
          >
            <span className="text-xs">🗑️</span>
          </button>
        </div>

        {node.unreadCount && node.unreadCount > 0 && (
          <span className="ml-auto bg-indigo-500 text-white text-[10px] px-1.5 rounded-full min-w-[1.25rem] text-center">
            {node.unreadCount}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className="pb-1 w-full relative">
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