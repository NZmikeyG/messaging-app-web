import React from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItemProps {
    id: string
    type: 'mention' | 'reply' | 'reaction' | 'message'
    user: {
        username: string
        avatar_url?: string | null
    }
    content: string
    timestamp: string
    isRead: boolean
    channelName?: string
    count?: number
    onClick: () => void
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
    type,
    user,
    content,
    timestamp,
    isRead,
    channelName,
    count,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent ${isRead ? 'hover:theme-bg-secondary' : 'theme-bg-secondary hover:theme-bg-hover border-l-purple-500'}`}
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                {user.avatar_url ? (
                    <div className="w-10 h-10 relative rounded-full overflow-hidden">
                        <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.username[0]?.toUpperCase()}
                    </div>
                )}

                {/* Type Icon Badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full theme-bg-tertiary flex items-center justify-center border theme-border">
                    {type === 'mention' && <span className="text-xs">@</span>}
                    {type === 'reply' && <span className="text-xs">↩️</span>}
                    {type === 'reaction' && <span className="text-xs">☺</span>}
                    {type === 'message' && <span className="text-xs">💬</span>}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm theme-text-primary truncate">
                        {user.username}
                        {count && count > 1 && <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">+{count - 1}</span>}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                        {tryFormatDate(timestamp)}
                    </span>
                </div>

                <div className="text-xs text-gray-400 truncate">
                    {channelName && <span className="text-indigo-400 mr-1">#{channelName}</span>}
                    <span className={isRead ? 'theme-text-muted' : 'theme-text-secondary font-medium'}>
                        {truncateContent(content)}
                    </span>
                </div>
            </div>

            {/* Read Status Dot (if unread) */}
            {!isRead && (
                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2"></div>
            )}
        </div>
    )
}

// Helpers
const truncateContent = (text: string, length = 60) => {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
}

const tryFormatDate = (dateString: string) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true }).replace('about ', '')
    } catch (e) {
        return 'recently'
    }
}
