'use client'

import React, { useState, useEffect } from 'react'
import { getAllUsers } from '@/lib/supabase/users'
import { sendDirectMessage } from '@/lib/supabase/directMessages'
import { useUserStore } from '@/store/useUserStore'
import type { Profile } from '@/types'

interface ForwardMessageModalProps {
    isOpen: boolean
    onClose: () => void
    content: string
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({ isOpen, onClose, content }) => {
    const { profile } = useUserStore()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (isOpen) {
            setLoading(true)
            getAllUsers().then(data => {
                setUsers(data)
                setLoading(false)
            })
        }
    }, [isOpen])

    const handleForward = async (recipientId: string) => {
        if (!profile) return
        try {
            setSending(true)
            await sendDirectMessage(profile.id, recipientId, `Forwarded: ${content}`)
            onClose()
            alert('Message forwarded!')
        } catch (err) {
            console.error(err)
            alert('Failed to forward message')
        } finally {
            setSending(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.id !== profile?.id && // Don't forward to self
        (u.email?.toLowerCase().includes(search.toLowerCase()) ||
            (u.username && u.username.toLowerCase().includes(search.toLowerCase())))
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col max-h-[80vh]">
                <h2 className="text-lg font-bold mb-4 text-gray-800">Forward Message</h2>

                <p className="text-xs text-gray-500 mb-2 truncate">&quot;{content}&quot;</p>

                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex-1 overflow-y-auto space-y-1">
                    {loading ? (
                        <p className="text-gray-500 text-sm text-center">Loading users...</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center">No users found</p>
                    ) : (
                        filteredUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleForward(user.id)}
                                disabled={sending}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded transition text-left disabled:opacity-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                                    {user.username?.[0] || 'U'}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-800">{user.username}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
