'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Channel {
  id: string
  name: string
  created_at: string
}

export const ChannelList: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.from('channels').select('*')
      if (error) setError(error.message)
      else setChannels((data as Channel[]) ?? [])
      setLoading(false)
    }
    fetchChannels()
  }, [])

  if (loading) return <div className="p-4">Loading channels...</div>
  if (error)
    return <div className="p-4 text-red-600 font-semibold">Error: {error}</div>
  if (!channels.length)
    return <div className="p-4 text-gray-500">No channels found.</div>

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Channels</h2>
      <ul className="space-y-2">
        {channels.map((channel) => (
          <li
            key={channel.id}
            className="px-4 py-2 bg-white hover:bg-blue-100 rounded border border-gray-300 text-lg font-medium transition cursor-pointer"
            style={{ color: '#222' }}
            onClick={() => router.push(`/dashboard/channel/${channel.id}`)}
            title="Click to enter channel"
          >
            #{channel.name || channel.id}
          </li>
        ))}
      </ul>
    </div>
  )
}
