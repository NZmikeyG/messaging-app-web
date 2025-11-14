'use client'

import React, { useEffect, useState } from 'react'
import { useChannelStore } from '@/store/useChannelStore'
import { useSupabase } from '@/hooks/useSupabase'
import ChannelList from './ChannelList'
import { CreateChannelModal } from './CreateChannelModal'
import './Sidebar.css'

const Sidebar: React.FC = () => {
  const {
    channels,
    setChannels,
    addChannel,
    isLoading,
    setIsLoading,
    setError,
  } = useChannelStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { getChannels, createChannel } = useSupabase()

  // Load channels on mount
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setIsLoading(true)
        const data = await getChannels()
        setChannels(data)
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to load channels'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadChannels()
  }, [getChannels, setChannels, setIsLoading, setError])

  const channelTree = useChannelStore((state) => state.buildChannelTree?.() || [])

  const handleCreateChannel = async (
    name: string,
    description?: string,
    isPrivate?: boolean
  ) => {
    try {
      setIsLoading(true)
      const newChannel = await createChannel({
        name,
        description,
        is_private: isPrivate,
      })
      addChannel(newChannel)
      setIsCreateModalOpen(false)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to create channel'
      )
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="workspace-name">A1 Company Ltd.</h1>
        <button
          className="create-channel-btn"
          onClick={() => setIsCreateModalOpen(true)}
          title="Create new channel"
        >
          +
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Home</div>
          <a href="#" className="nav-item nav-item-home">
            🏠 Home
          </a>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Channels</div>
          {isLoading ? (
            <div className="nav-item">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="nav-item">No channels yet</div>
          ) : (
            <ChannelList channels={channelTree} />
          )}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Direct Messages</div>
          <div className="nav-item">💬 DMs</div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Activity</div>
          <div className="nav-item">📋 Activity</div>
        </div>
      </nav>

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </aside>
  )
}

export default Sidebar
