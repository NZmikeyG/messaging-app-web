'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ActivityItem, ActivityItemProps } from './ActivityItem'
import { useUserStore } from '@/store/useUserStore'
import { useRouter } from 'next/navigation'

// Initial types for our data
type ActivityFilter = 'All' | 'Mentions' | 'Unread'

interface ActivityPanelProps {
    isOpen: boolean
    onClose: () => void
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ isOpen, onClose }) => {
    const [filter, setFilter] = useState<ActivityFilter>('All')
    const [activities, setActivities] = useState<ActivityItemProps[]>([])
    const [loading, setLoading] = useState(false)

    const { profile } = useUserStore()
    const router = useRouter()

    // Fetch Activity Data
    const fetchActivity = React.useCallback(async () => {
        if (!profile?.id) return
        setLoading(true)

        try {
            // 1. Fetch recent messages (last 50) that might be relevant
            // In a real app with "user_activity" table, we'd query that.
            // For now, we simulate activity by fetching recent messages in channels we are part of
            // excluding our own.

            // Get my channels first (optimization: passing IDs would be better but keeping it simple)
            const { data: myChannels } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', profile.id)

            const channelIds = myChannels?.map((c: { channel_id: string }) => c.channel_id) || []

            if (channelIds.length === 0) {
                setActivities([])
                setLoading(false)
                return
            }

            const { data: messages, error } = await supabase
                .from('messages')
                .select(`
            *,
            profiles:user_id(username, avatar_url)
        `)
                .in('channel_id', channelIds)
                .neq('user_id', profile.id) // Don't show my own
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            console.log('Fetched messages for activity:', messages?.length)

            // 1b. Fetch Channel Names for these messages manually to avoid FK errors
            const uniqueChannelIds = Array.from(new Set(messages?.map((m: any) => m.channel_id) || []))
            let channelMap: Record<string, string> = {}

            if (uniqueChannelIds.length > 0) {
                const { data: channelsData } = await supabase
                    .from('channels')
                    .select('id, name')
                    .in('id', uniqueChannelIds)

                channelsData?.forEach((c: any) => {
                    channelMap[c.id] = c.name
                })
            }

            // Transform to Activity Items
            // We will perform naive grouping here: multiple msgs from same user in same channel = 1 item?
            // For now, simple list.
            const items: ActivityItemProps[] = (messages || []).map((msg: any) => {
                const isMention = msg.content.includes(`@${profile.username}`)

                let type: ActivityItemProps['type'] = 'message'
                if (isMention) type = 'mention'
                if (msg.parent_id) type = 'reply'

                return {
                    id: msg.id,
                    type,
                    user: {
                        username: msg.profiles?.username || 'Unknown',
                        avatar_url: msg.profiles?.avatar_url
                    },
                    content: msg.content,
                    timestamp: msg.created_at,
                    isRead: false, // Todo: Real read state
                    channelName: channelMap[msg.channel_id],
                    onClick: () => {
                        // Navigate to channel and maybe highlight message
                        router.push(`/dashboard/channel/${msg.channel_id}`)
                        onClose() // Auto close on click? Maybe optional.
                    }
                }
            })

            setActivities(items)

        } catch (e: any) {
            console.error('Error fetching activity:', e?.message || e)
        } finally {
            setLoading(false)
        }
    }, [profile?.id, profile?.username, router, onClose])

    useEffect(() => {
        if (isOpen) {
            fetchActivity()
        }
    }, [isOpen, fetchActivity])


    // Filtering Logic
    const filteredActivities = useMemo(() => {
        return activities.filter(item => {
            if (filter === 'Mentions') return item.type === 'mention'
            if (filter === 'Unread') return !item.isRead
            return true
        })
    }, [activities, filter])

    // Mark all read handler (stub)
    const handleMarkAllRead = () => {
        setActivities(prev => prev.map(a => ({ ...a, isRead: true })))
    }

    return (
        <div className={`
        fixed top-0 left-[72px] h-full w-80 theme-bg-primary border-r theme-border shadow-2xl z-40 
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
    `}>
            {/* Header */}
            <div className="p-4 border-b theme-border">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold theme-text-primary">Activity</h2>
                    <button onClick={handleMarkAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                        Mark all read
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 theme-bg-tertiary p-1 rounded-lg">
                    {(['All', 'Mentions', 'Unread'] as ActivityFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${filter === f ? 'theme-bg-input theme-text-primary shadow-sm' : 'theme-text-muted hover:theme-text-primary'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto h-[calc(100%-130px)] p-2 space-y-1">
                {loading ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex gap-3">
                                <div className="w-10 h-10 bg-gray-800 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                                    <div className="h-2 bg-gray-800 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
                        <span className="text-2xl">💤</span>
                        <p className="text-sm">No recent activity</p>
                        {filter !== 'All' && <button onClick={() => setFilter('All')} className="text-xs text-indigo-400">Clear filters</button>}
                    </div>
                ) : (
                    filteredActivities.map((item) => (
                        <ActivityItem key={item.id} {...item} />
                    ))
                )}
            </div>
        </div>
    )
}
