import React from 'react'
import Image from 'next/image'

interface User {
    id: string
    username: string
    avatar_url?: string | null
}

interface MentionPopupProps {
    users: User[]
    onSelect: (user: User) => void
    onClose: () => void
    position: { top: number, left: number }
}

export const MentionPopup: React.FC<MentionPopupProps> = ({ users, onSelect, onClose, position }) => {
    if (users.length === 0) return null

    return (
        <div
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden w-64 max-h-60 overflow-y-auto"
            style={{
                bottom: '80px', // Fixed above input bar for now
                left: 'calc(50% - 8rem)' // Centered or relative
            }}
        >
            <div className="p-2 text-xs text-gray-500 font-bold uppercase border-b border-gray-800">
                Mention Member
            </div>
            {users.map(user => (
                <button
                    key={user.id}
                    onClick={() => onSelect(user)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-600 flex items-center gap-2 transition-colors group"
                >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 group-hover:text-white shrink-0 overflow-hidden relative">
                        {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                        ) : (
                            (user.username?.[0]?.toUpperCase()) || '?'
                        )}
                    </div>
                    <span className="text-gray-300 group-hover:text-white text-sm font-medium truncate">
                        {user.username}
                    </span>
                </button>
            ))}
        </div>
    )
}
