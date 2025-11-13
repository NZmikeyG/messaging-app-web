'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import type { Channel } from '@/types'
import toast from 'react-hot-toast'

interface SidebarProps {
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
}

export function Sidebar({ selectedChannelId, onSelectChannel }: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const { getChannels } = useSupabase()

  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true)
        const data = await getChannels()
        setChannels(data)

        if (data.length > 0 && !selectedChannelId) {
          onSelectChannel(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load channels:', err)
        toast.error('Failed to load channels')
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [getChannels, selectedChannelId, onSelectChannel])

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Channels</h2>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">Loading channels...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No channels yet</p>
          </div>
        ) : (
          channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                selectedChannelId === channel.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="font-medium">#{channel.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
