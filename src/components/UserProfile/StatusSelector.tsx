'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'

type StatusType = 'online' | 'busy' | 'out_of_office' | 'offline'

interface StatusSelectorProps {
    userId: string
    currentStatus?: string
}

export default function StatusSelector({ userId, currentStatus = 'online' }: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<StatusType>((currentStatus as StatusType) || 'online')
    const { updateProfile } = useUserStore()

    React.useEffect(() => {
        if (currentStatus) {
            setStatus(currentStatus as StatusType)
        }
    }, [currentStatus])

    const handleStatusChange = async (newStatus: StatusType) => {
        try {
            setLoading(true)
            setStatus(newStatus)
            setIsOpen(false)

            // 1. Update user_presence
            const { error: presenceError } = await supabase
                .from('user_presence')
                .upsert({
                    user_id: userId,
                    status: newStatus,
                    is_online: newStatus !== 'offline',
                    last_seen: newStatus === 'offline' ? new Date().toISOString() : undefined
                }, { onConflict: 'user_id' })

            if (presenceError) throw presenceError

            // 2. Update users table (profile) using robust function
            const { updateUserProfile } = await import('@/lib/supabase/users')
            await updateUserProfile(userId, { status: newStatus })

            // 3. Update local store
            updateProfile({ status: newStatus })

            console.log(`✅ [STATUS] Updated to ${newStatus}`)
        } catch (err: any) {
            console.error('❌ [STATUS] Failed to update:', err.message || err)
            // Revert optimization would go here
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'online': return 'bg-green-500'
            case 'busy': return 'bg-red-500'
            case 'out_of_office': return 'bg-yellow-500'
            case 'offline': return 'bg-gray-500'
            default: return 'bg-gray-400'
        }
    }

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'online': return 'Active'
            case 'busy': return 'Busy'
            case 'out_of_office': return 'Out of Office'
            case 'offline': return 'Offline'
            default: return 'Unknown'
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 transition w-full"
            >
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} shadow-sm`}></div>
                <span className="text-sm text-gray-300 font-medium truncate">
                    {getStatusLabel(status)}
                </span>
                <span className="ml-auto text-xs text-gray-500">▼</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 w-48 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                        {(['online', 'busy', 'out_of_office', 'offline'] as StatusType[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => handleStatusChange(s)}
                                className="flex items-center gap-3 w-full px-4 py-2 hover:bg-gray-700 transition text-left"
                            >
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(s)}`}></div>
                                <span className="text-sm text-gray-200">{getStatusLabel(s)}</span>
                                {status === s && <span className="ml-auto text-blue-400">✓</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
