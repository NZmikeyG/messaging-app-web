'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { sendDirectMessage } from '@/lib/supabase/directMessages'
import { useUserStore } from '@/store/useUserStore'

interface UserDMPopoverProps {
    isOpen: boolean
    onClose: () => void
    targetUser: {
        id: string
        username: string
        avatar_url?: string | null
    } | null
}

export const UserDMPopover: React.FC<UserDMPopoverProps> = ({ isOpen, onClose, targetUser }) => {
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const currentUser = useUserStore(state => state.profile)

    if (!isOpen || !targetUser) return null

    const handleSend = async () => {
        if (!currentUser?.id || !message.trim()) return

        setSending(true)
        try {
            await sendDirectMessage(currentUser.id, targetUser.id, message)
            setMessage('')
            onClose()
            alert(`Message sent to ${targetUser.username}!`)
        } catch (error) {
            console.error('Failed to send DM:', error)
            alert('Failed to send message. Please try again.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden relative border border-gray-600">
                        {targetUser.avatar_url ? (
                            <Image src={targetUser.avatar_url} alt={targetUser.username} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                                {targetUser.username[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{targetUser.username}</h3>
                        <p className="text-gray-400 text-xs">Send a direct message</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Input */}
                <textarea
                    autoFocus
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Message @${targetUser.username}...`}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 min-h-[100px] resize-none mb-4"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                />

                {/* Footer */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? 'Sending...' : 'Send Message'}
                    </button>
                </div>
            </div>
        </div>
    )
}
