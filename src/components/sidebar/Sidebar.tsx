'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getChannelHierarchy,
  createChannel,
  updateChannel,
  deleteChannel,
  addChannelMember
} from '@/lib/supabase/channels'
import { getConversations, type Conversation } from '@/lib/supabase/directMessages'
import { supabase } from '@/lib/supabase/client'
import type { ChannelHierarchy, ChannelNode } from '@/types'
import { useUserStore } from '@/store/useUserStore'
import StatusSelector from '@/components/UserProfile/StatusSelector'
import ChannelTreeNode from './ChannelTreeNode'
import { CreateChannelModal } from './CreateChannelModal'
import { NewMessageModal } from './NewMessageModal'
import { RenameChannelModal } from './RenameChannelModal'
import { DeleteChannelModal } from './DeleteChannelModal'
import { EditProfileModal } from '@/components/UserProfile/EditProfileModal'
import SidebarNav, { type NavTab } from './SidebarNav'
import SidebarPane from './SidebarPane'

import { ActivityPanel } from './ActivityPanel'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<NavTab>('channels')
  const [isActivityOpen, setIsActivityOpen] = useState(false)

  // Modal States
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [createChannelParentId, setCreateChannelParentId] = useState<string | null>(null)

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [channelToRename, setChannelToRename] = useState<{ id: string, name: string } | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<{ id: string, name: string } | null>(null)

  const handleTabSelect = (tab: NavTab) => {
    if (tab === 'activity') {
      setIsActivityOpen(!isActivityOpen)
    } else if (tab === 'settings') {
      // Navigate to dedicated settings page
      router.push('/dashboard/settings')
    } else if (tab === 'files') {
      // Navigate to dedicated files page
      router.push('/dashboard/files')
    } else {
      setActiveTab(tab)
      setIsActivityOpen(false) // Auto-close activity panel
    }
  }

  // Load Channels & DMs
  const loadData = useCallback(async () => {
    try {
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

  // --- Action Handlers for Modals ---
  const handleRenameChannel = (channelId: string, currentName: string) => {
    console.log('Sidebar: handleRenameChannel called', channelId)
    setChannelToRename({ id: channelId, name: currentName })
    setRenameModalOpen(true)
  }

  const handleDeleteChannel = (channelId: string) => {
    console.log('Sidebar: handleDeleteChannel called', channelId)
    // We need to find the channel name for the modal.
    // Since we only have ID here, we can either pass name from the tree node or find it in the state.
    // The tree node passes `onDelete?.(node.id)`.
    // Let's find it in the flat list if possible, or just use "this channel".
    const findChannelName = (nodes: ChannelNode[], id: string): string | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node.name
        if (node.children) {
          const found = findChannelName(node.children, id)
          if (found) return found
        }
      }
      return undefined
    }
    const channelName = findChannelName(channels, channelId)
    setChannelToDelete({ id: channelId, name: channelName || 'this channel' })
    setDeleteModalOpen(true)
  }

  const performRename = async (newName: string) => {
    if (!channelToRename) return
    try {
      await updateChannel(channelToRename.id, { name: newName })
      loadData()
    } catch (err: any) {
      alert('Failed to rename channel: ' + (err.message || 'Unknown error'))
    } finally {
      setRenameModalOpen(false)
      setChannelToRename(null)
    }
  }

  const performDelete = async () => {
    if (!channelToDelete) return
    try {
      await deleteChannel(channelToDelete.id)
      loadData()
    } catch (error: any) {
      console.error('Failed to delete channel:', error)
      alert('Failed to delete: ' + (error.message || 'Unknown error'))
    } finally {
      setDeleteModalOpen(false)
      setChannelToDelete(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('❌ Sign out failed:', error)
    }
  }

  // --- Render Pane Content ---

  const renderChannelsContent = () => (
    <SidebarPane
      title={
        <Link href="/dashboard/channels" className="hover:text-gray-300 transition-colors">
          Channels
        </Link>
      }
      headerAction={
        <button
          onClick={() => handleOpenCreateChannel(null)}
          className="text-gray-400 hover:text-white"
          title="Create Channel"
        >
          <span className="text-xl">+</span>
        </button>
      }
    >
      <div className="p-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter..."
          className="w-full px-3 py-1.5 theme-bg-input theme-text-primary placeholder-gray-500 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border theme-border mb-3"
        />

        {error && (
          <div className="mb-3 p-2 bg-red-900/50 text-red-200 rounded text-xs">
            {error}
          </div>
        )}

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

        {channels.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No channels found</p>
            <button
              onClick={() => handleOpenCreateChannel(null)}
              className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs font-medium"
            >
              Create your first channel
            </button>
          </div>
        )}
      </div>
    </SidebarPane>
  )

  const renderDMsContent = () => (
    <SidebarPane
      title={
        <Link href="/dashboard/dm" className="hover:text-gray-300 transition-colors">
          Chat
        </Link>
      }
      headerAction={
        <button
          onClick={() => setIsNewMessageOpen(true)}
          className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
          title="New Message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
      }
    >
      <div className="p-2 space-y-1">
        {conversations.length === 0 && !loading ? (
          <p className="text-gray-500 text-xs px-2 py-4 text-center">No recent conversations</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/dashboard/dm/${conv.other_user?.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 rounded-lg transition group text-left"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-sm font-semibold">
                  {conv.other_user?.username?.[0] || '?'}
                </div>
                {conv.other_user?.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium theme-text-primary group-hover:theme-text-primary truncate">
                    {conv.other_user?.username || 'Unknown'}
                  </span>
                  {/* Todo: Timestamp */}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {conv.last_message_content || 'Started a conversation'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </SidebarPane>
  )

  const renderSettingsContent = () => (
    <SidebarPane title="Settings">
      <div className="p-2">
        <button
          onClick={() => setIsEditProfileOpen(true)}
          className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition text-sm font-medium flex items-center gap-2 mb-2"
        >
          <span>✏️</span> Edit Profile
        </button>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-red-300 hover:text-red-200 transition text-sm font-medium flex items-center gap-2"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </SidebarPane>
  )

  return (
    <div className="flex h-full relative"> {/* Relative for absolute positioning of activity panel */}
      {/* 1. Primary Navigation Rail */}
      <SidebarNav
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
      />

      {/* Activity Panel (Pop-out) */}
      <ActivityPanel
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      {/* 2. Secondary Sidebar Pane */}
      <div className="theme-bg-primary border-r theme-border w-72 shrink-0 flex flex-col h-full">
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {activeTab === 'channels' && renderChannelsContent()}
          {activeTab === 'dms' && renderDMsContent()}
          {activeTab === 'settings' && renderSettingsContent()}
          {(activeTab !== 'channels' && activeTab !== 'dms' && activeTab !== 'settings') && (
            <SidebarPane title="Coming Soon">
              <div className="flex items-center justify-center p-8 text-gray-500 text-sm">
                This feature is currently under development.
              </div>
            </SidebarPane>
          )}
        </div>

        {/* User Profile Footer (Always visible at bottom of pane) */}
        <div className="p-3 theme-bg-tertiary border-t theme-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 relative group cursor-pointer overflow-hidden shadow-md"
              onClick={() => setIsEditProfileOpen(true)}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{profile?.username?.[0]?.toUpperCase() || 'U'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px]">Edit</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold theme-text-primary truncate pr-2">
                  {profile?.username || 'User'}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {profile?.email}
              </div>
            </div>
          </div>
          <div className="mt-2">
            {profile && <StatusSelector userId={profile.id} currentStatus={profile.status} />}
          </div>
        </div>
      </div>

      {/* Modals */}
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

      {/* Action Modals */}
      {channelToRename && (
        <RenameChannelModal
          isOpen={renameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          onRename={performRename}
          currentName={channelToRename.name}
        />
      )}

      {channelToDelete && (
        <DeleteChannelModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDelete={performDelete}
          channelName={channelToDelete.name}
        />
      )}
    </div>
  )
}
