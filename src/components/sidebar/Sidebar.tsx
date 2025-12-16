'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getChannelHierarchy,
  createChannel,
  updateChannel,
  deleteChannel,
  addChannelMember
} from '@/lib/supabase/channels'
import { getConversations, type Conversation } from '@/lib/supabase/directMessages'
import { supabase } from '@/lib/supabase/client'
import type { Channel, ChannelHierarchy, ChannelNode } from '@/types'
import { useUserStore } from '@/store/useUserStore'
import StatusSelector from '@/components/UserProfile/StatusSelector'
import ChannelTreeNode from './ChannelTreeNode'
import { CreateChannelModal } from './CreateChannelModal'
import { NewMessageModal } from './NewMessageModal'
import { EditProfileModal } from '@/components/UserProfile/EditProfileModal'

interface SidebarProps {
  workspaceId: string
  activeChannelId?: string
  onChannelSelect?: (channelId: string) => void
  onCreateChannel?: () => void
  onNewMessage?: () => void
}

export default function Sidebar({
  workspaceId,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onNewMessage,
}: SidebarProps) {
  const router = useRouter()
  const { profile } = useUserStore()
  const [channels, setChannels] = useState<ChannelNode[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'channels' | 'dms' | 'settings'>('channels')

  // Modal States
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [createChannelParentId, setCreateChannelParentId] = useState<string | null>(null)

  // Load Channels & DMs
  const loadData = useCallback(async () => {
    try {
      // Don't show loading spinner on background polls if already loaded
      if (channels.length === 0) setLoading(true)

      // 1. Load Channels
      const hierarchy = await getChannelHierarchy(workspaceId)

      const transformToNodes = (items: ChannelHierarchy[], level = 0): ChannelNode[] => {
        return items.map(item => ({
          ...item,
          level,
          children: item.children ? transformToNodes(item.children, level + 1) : []
        }))
      }
      setChannels(transformToNodes(hierarchy))

      // 2. Load DMs (if profile exists)
      if (profile?.id) {
        const dms = await getConversations(profile.id)
        setConversations(dms)
      }

    } catch (err) {
      console.error('❌ [SIDEBAR] Error loading data:', err)
      if (channels.length === 0) {
        setError('Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, profile?.id, channels.length])

  // Initial Load & Polling (5 seconds)
  useEffect(() => {
    loadData()
    const intervalId = setInterval(() => loadData(), 5000)
    return () => clearInterval(intervalId)
  }, [loadData])


  // --- Handlers ---

  const handleOpenCreateChannel = (parentId: string | null = null) => {
    setCreateChannelParentId(parentId)
    setIsCreateChannelOpen(true)
  }

  const handleCreateChannelSubmit = async (
    name: string,
    description?: string,
    isPrivate?: boolean,
    members?: string[]
  ) => {
    try {
      const newChannel = await createChannel({
        workspaceId,
        name,
        description,
        isPrivate,
        parentId: createChannelParentId || undefined
      })

      // Add members if any
      if (members && members.length > 0) {
        for (const userId of members) {
          await addChannelMember(newChannel.id, userId, 'member')
        }
      }

      loadData()
    } catch (err) {
      console.error('Failed to create channel:', err)
      throw err
    }
  }

  const handleAddSubChannel = (parentId: string) => {
    handleOpenCreateChannel(parentId)
  }

  const handleRenameChannel = async (channelId: string, currentName: string) => {
    const newName = window.prompt("Enter new channel name:", currentName)
    if (newName && newName.trim() && newName !== currentName) {
      try {
        await updateChannel(channelId, { name: newName.trim() })
        loadData()
      } catch (err) {
        alert('Failed to rename channel')
      }
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (window.confirm("Are you sure you want to delete this channel? This cannot be undone.")) {
      try {
        await deleteChannel(channelId)
        alert('Channel deleted successfully')
        loadData()
      } catch (error) {
        console.error('Failed to delete channel:', error)
        alert('Failed to delete channel. Make sure you are the owner.')
      }
    }
  }

  const handleNewMessage = () => {
    setIsNewMessageOpen(true)
    onNewMessage?.()
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('❌ Sign out failed:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64 shrink-0 border-r border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 text-left hover:opacity-80 transition"
          title="Back to dashboard"
        >
          <h1 className="text-lg font-bold">Harbour Basketball</h1>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className="p-1 hover:bg-gray-800 rounded transition"
        >
          ⚙️
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3 py-1.5 rounded text-sm transition ${activeTab === 'channels' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          💬 Channels
        </button>
        <button
          onClick={() => setActiveTab('dms')}
          className={`px-3 py-1.5 rounded text-sm transition ${activeTab === 'dms' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          📧 DMs
        </button>
      </div>

      {/* Search - Only for Channels */}
      {activeTab === 'channels' && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search channels..."
          className="mx-4 mt-2 px-3 py-2 bg-gray-800 text-white placeholder-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* CHANNELS TAB */}
        {activeTab === 'channels' && (
          <div className="p-4">
            <Link
              href="/dashboard/channels"
              className="text-sm font-semibold text-gray-400 uppercase mb-3 hover:text-white transition w-full text-left flex items-center gap-2 block"
            >
              Channels
              <span className="text-xs opacity-50">↗</span>
            </Link>

            {error && (
              <div className="mb-3 p-2 bg-red-900 text-red-100 rounded text-xs flex items-center justify-between">
                {error}
                <button onClick={loadData} className="ml-2 px-2 py-1 bg-red-800 rounded hover:bg-red-700">Retry</button>
              </div>
            )}

            {channels.length === 0 && !loading ? (
              <p className="text-gray-400 text-sm">No channels found</p>
            ) : (
              <ul className="channel-tree space-y-0.5">
                {channels
                  .filter(node =>
                    !searchQuery ||
                    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (node.children && node.children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  )
                  .map((node) => (
                    <ChannelTreeNode
                      key={node.id}
                      node={node}
                      onSelect={(id) => onChannelSelect?.(id)}
                      onAddSubChannel={handleAddSubChannel}
                      onRename={handleRenameChannel}
                      onDelete={handleDeleteChannel}
                    />
                  ))}
              </ul>
            )}

            <button
              onClick={() => handleOpenCreateChannel(null)}
              className="w-full mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition"
            >
              + Create channel
            </button>
          </div>
        )}

        {/* DMS TAB */}
        {activeTab === 'dms' && (
          <div className="p-4 space-y-2">
            <button
              onClick={() => router.push('/dashboard/dm')}
              className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition text-sm font-medium"
            >
              <span>📨</span>
              All Messages
            </button>
            <button
              onClick={() => setIsNewMessageOpen(true)}
              className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition text-sm font-medium"
            >
              <span>+</span>
              New Message
            </button>

            <div className="my-3 border-t border-gray-700"></div>

            <div className="space-y-1">
              {conversations.length === 0 && !loading ? (
                <p className="text-gray-500 text-xs px-2">No recent conversations</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => router.push(`/dashboard/dm/${conv.other_user?.id}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded transition group text-left"
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                        {conv.other_user?.username?.[0] || '?'}
                      </div>
                      {conv.other_user?.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm text-gray-300 group-hover:text-white truncate font-medium">
                        {conv.other_user?.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {conv.last_message_content || 'Started a conversation'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="p-4">
            {/* Settings Content */}
            <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition bg-gray-800 mt-2">
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 bg-gray-950 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold shrink-0 relative group cursor-pointer overflow-hidden"
            onClick={() => setIsEditProfileOpen(true)}
          >
            {/* Debug Log */}
            {/* Debug Log Removed */}
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{profile?.username?.[0]?.toUpperCase() || 'U'}</span>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs">✎</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white truncate">
                {profile?.username || 'User'}
              </div>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="text-gray-500 hover:text-white text-xs p-1"
                title="Edit Profile"
              >
                ⚙️
              </button>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {profile?.email}
            </div>
          </div>
        </div>
        {profile && <StatusSelector userId={profile.id} currentStatus={profile.status} />}
      </div>

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreateChannel={handleCreateChannelSubmit}
        parentChannelId={createChannelParentId}
      />

      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </div>
  )
}
