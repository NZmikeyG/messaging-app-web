'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { Channel } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'

interface SidebarProps {
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
}

export function Sidebar({ selectedChannelId, onSelectChannel }: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const { getChannels } = useSupabase()

  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true)
        const data = await getChannels()
        setChannels(data)
        // Auto-select first channel
        if (data.length > 0 && !selectedChannelId) {
          onSelectChannel(data[0].id)
        }
      } catch (error) {
        toast.error('Failed to load channels')
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [getChannels, onSelectChannel, selectedChannelId])

  return (
    <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Channels</h1>
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : channels.length === 0 ? (
          <p className="text-sm text-gray-500">No channels available</p>
        ) : (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel.id}>
                <button
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  # {channel.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
